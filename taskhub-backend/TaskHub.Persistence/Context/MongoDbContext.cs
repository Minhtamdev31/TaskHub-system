using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TaskHub.Persistence.Context
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            // Đọc chuỗi kết nối từ file appsettings.json của project API
            var connectionString = configuration.GetSection("MongoDbSettings:ConnectionString").Value;
            var databaseName = configuration.GetSection("MongoDbSettings:DatabaseName").Value;

            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        // Hàm helper để lấy nhanh một Collection (Bảng) dữ liệu
        public IMongoCollection<T> GetCollection<T>(string name)
        {
            return _database.GetCollection<T>(name);
        }

        /// <summary>
        /// Tạo index cho các truy vấn nóng. Gọi 1 lần lúc khởi động. CreateOne là idempotent —
        /// index đã tồn tại thì bỏ qua. Tên collection = tên class entity (GetCollection dùng typeof(T).Name).
        /// </summary>
        public async Task EnsureIndexesAsync()
        {
            await CreateIndexAsync("User", new BsonDocument("email", 1), unique: true);
            await CreateIndexAsync("User", new BsonDocument("username", 1), unique: true);

            await CreateIndexAsync("TaskItem", new BsonDocument("userId", 1));
            await CreateIndexAsync("TaskItem", new BsonDocument("projectId", 1));
            await CreateIndexAsync("TaskItem", new BsonDocument("dueDate", 1));

            await CreateIndexAsync("Project", new BsonDocument("ownerId", 1));
            await CreateIndexAsync("Project", new BsonDocument("members.userId", 1));

            await CreateIndexAsync("Notification", new BsonDocument("userId", 1));
            await CreateIndexAsync("Comment", new BsonDocument("taskId", 1));

            await CreateIndexAsync("OtpRecord", new BsonDocument { { "Email", 1 }, { "Type", 1 } });
            // TTL: Mongo tự xóa OTP khi ExpiryTime đã qua (giữ collection sạch, query nhẹ).
            await CreateTtlIndexAsync("OtpRecord", "ExpiryTime");
        }

        private async Task CreateIndexAsync(string collectionName, BsonDocument keys, bool unique = false)
        {
            try
            {
                var collection = _database.GetCollection<BsonDocument>(collectionName);
                var model = new CreateIndexModel<BsonDocument>(keys, new CreateIndexOptions { Unique = unique });
                await collection.Indexes.CreateOneAsync(model);
            }
            catch (Exception ex)
            {
                // Vd: index unique gặp dữ liệu trùng — log để biết, không làm sập khởi động.
                Console.WriteLine($"[INDEX] Bỏ qua index {collectionName}({keys}): {ex.Message}");
            }
        }

        private async Task CreateTtlIndexAsync(string collectionName, string dateField)
        {
            try
            {
                var collection = _database.GetCollection<BsonDocument>(collectionName);
                var model = new CreateIndexModel<BsonDocument>(
                    new BsonDocument(dateField, 1),
                    new CreateIndexOptions { ExpireAfter = TimeSpan.Zero });
                await collection.Indexes.CreateOneAsync(model);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[INDEX-TTL] Bỏ qua TTL {collectionName}.{dateField}: {ex.Message}");
            }
        }
    }
}
