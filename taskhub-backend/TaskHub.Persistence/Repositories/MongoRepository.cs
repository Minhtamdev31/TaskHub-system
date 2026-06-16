using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using TaskHub.Application.Interfaces;
using TaskHub.Persistence.Context;

namespace TaskHub.Persistence.Repositories
{
    public class MongoRepository<T> : IMongoRepository<T> where T : class
    {
        protected readonly IMongoCollection<T> _collection;

        public MongoRepository(MongoDbContext context)
        {

            _collection = context.GetCollection<T>(typeof(T).Name);
        }

        public async Task<List<T>> GetAllAsync()
        {
            return await _collection.Find(_ => true).ToListAsync();
        }

        public async Task<T> GetByIdAsync(string id)
        {
          
            var filter = Builders<T>.Filter.Eq("Id", id);
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(T entity)
        {
            await _collection.InsertOneAsync(entity);
        }

        public async Task UpdateAsync(string id, T entity)
        {
            var filter = Builders<T>.Filter.Eq("Id", id);
            await _collection.ReplaceOneAsync(filter, entity);
        }

        public async Task DeleteAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("Id", id);
            await _collection.DeleteOneAsync(filter);
        }

        // Driver dịch Expression sang truy vấn Mongo, tôn trọng [BsonElement]/[BsonRepresentation]
        // (vd string -> ObjectId) và dùng index nếu có.
        public async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate)
        {
            return await _collection.Find(predicate).ToListAsync();
        }

        public async Task<T?> FindOneAsync(Expression<Func<T, bool>> predicate)
        {
            return await _collection.Find(predicate).FirstOrDefaultAsync();
        }

        public async Task<long> CountAsync(Expression<Func<T, bool>> predicate)
        {
            return await _collection.CountDocumentsAsync(predicate);
        }

        public async Task<long> DeleteManyAsync(Expression<Func<T, bool>> predicate)
        {
            var result = await _collection.DeleteManyAsync(predicate);
            return result.DeletedCount;
        }
    }
}
