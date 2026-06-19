using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace TaskHub.Application.Interfaces
{
    public interface IMongoRepository<T> where T : class
    {
        Task<List<T>> GetAllAsync();
        Task<T> GetByIdAsync(string id);
        Task CreateAsync(T entity);
        Task UpdateAsync(string id, T entity);
        Task DeleteAsync(string id);

        // Truy vấn có điều kiện — để DB lọc bằng index thay vì kéo cả collection về app.
        Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate);
        Task<T?> FindOneAsync(Expression<Func<T, bool>> predicate);
        Task<long> CountAsync(Expression<Func<T, bool>> predicate);

        // Phân trang: bỏ qua `skip` bản ghi, lấy `limit` bản ghi, sắp mới-nhất-trước (theo _id giảm dần).
        Task<List<T>> FindPagedAsync(Expression<Func<T, bool>> predicate, int skip, int limit);
        Task<long> DeleteManyAsync(Expression<Func<T, bool>> predicate);
    }
}
