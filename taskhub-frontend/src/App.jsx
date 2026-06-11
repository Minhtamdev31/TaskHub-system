import { useState } from "react";
import "./App.css";

const tabs = ["Overview", "Projects", "Tasks"];

const features = [
  {
    title: "Kanban board trực quan",
    text: "Quản lý sprint, phân công công việc và theo dõi tiến độ bằng bảng Todo – In Progress – Done.",
    badge: "Board",
  },
  {
    title: "Password Vault an toàn",
    text: "Lưu tài khoản chung, mật khẩu và token trong một nơi được bảo vệ, dễ chia sẻ cho team.",
    badge: "Vault",
  },
  {
    title: "Subscription & payment",
    text: "Mở khóa gói Premium, quản lý thanh toán và nâng cấp trải nghiệm làm việc theo nhu cầu.",
    badge: "Billing",
  },
];

const tasks = [
  { id: 1, title: "Thiết kế dashboard", status: "Todo", owner: "An" },
  { id: 2, title: "Review API tasks", status: "In Progress", owner: "Linh" },
  { id: 3, title: "Upload release notes", status: "Done", owner: "Huy" },
];

const highlights = [
  { label: "Projects", value: "18", detail: "Active workspaces" },
  { label: "Tasks", value: "124", detail: "Assigned this week" },
  { label: "Team", value: "8", detail: "Members online" },
];

function App() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">T</span>
          <span>
            <strong>TaskHub</strong>
            <small>Project & Password Workspace</small>
          </span>
        </a>
        <nav className="nav-links">
          <a href="#features">Tính năng</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#pricing">Bảng giá</a>
        </nav>
        <div className="nav-actions">
          <button type="button" className="ghost-btn">
            Đăng nhập
          </button>
          <button type="button" className="primary-btn">
            Bắt đầu ngay
          </button>
        </div>
      </header>

      <main className="main-grid">
        <section className="hero-card" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              Giải pháp quản trị công việc cho team hiện đại
            </p>
            <h1>
              TaskHub giúp bạn tổ chức dự án, công việc và tài khoản dùng chung
              ở một nơi.
            </h1>
            <p className="lede">
              Từ bảng Kanban, phân quyền thành viên, tới Password Vault và thanh
              toán gói Premium, TaskHub mang lại trải nghiệm làm việc mượt mà,
              minh bạch và tiết kiệm thời gian.
            </p>
            <div className="cta-row">
              <button type="button" className="primary-btn">
                Dùng thử miễn phí
              </button>
              <button type="button" className="ghost-btn">
                Xem demo
              </button>
            </div>
            <ul className="pill-list">
              <li>Realtime task board</li>
              <li>Secure vault</li>
              <li>Team collaboration</li>
            </ul>
          </div>

          <aside className="hero-panel-card">
            <div className="mini-card accent-card">
              <span>Weekly progress</span>
              <strong>82%</strong>
              <small>+12% vs tuần trước</small>
            </div>
            <div className="mini-card soft-card">
              <span>Tasks completed</span>
              <strong>36</strong>
              <small>5 tasks cần review</small>
            </div>
            <div className="mini-card dark-card">
              <span>Vault security</span>
              <strong>99.2%</strong>
              <small>Không có rủi ro đáng kể</small>
            </div>
          </aside>
        </section>

        <section className="stats-grid">
          {highlights.map((item) => (
            <article className="stat-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </section>

        <section className="feature-grid" id="features">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-badge">{feature.badge}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid" id="dashboard">
          <article className="panel-card dashboard-card">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h2>Quản lý mọi việc từ một giao diện</h2>
              </div>
              <div className="tab-list">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "tab-btn active" : "tab-btn"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="board-preview">
              <div className="board-column">
                <h3>Todo</h3>
                <div className="task-chip">Research requirements</div>
                <div className="task-chip">Prepare onboarding</div>
              </div>
              <div className="board-column active-column">
                <h3>In Progress</h3>
                <div className="task-chip strong">API integration</div>
                <div className="task-chip">Password vault flow</div>
              </div>
              <div className="board-column done-column">
                <h3>Done</h3>
                <div className="task-chip">Design review</div>
                <div className="task-chip">Weekly summary</div>
              </div>
            </div>

            <p className="panel-note">
              Tab hiện tại: <strong>{activeTab}</strong>. Giao diện này đã sẵn
              sàng kết nối với API backend để hiển thị dữ liệu thực tế.
            </p>
          </article>

          <article className="panel-card timeline-card">
            <div className="panel-head compact">
              <div>
                <p className="eyebrow">Today</p>
                <h2>Những việc cần ưu tiên</h2>
              </div>
              <span className="badge">Live</span>
            </div>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.id} className="task-item">
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.owner}</p>
                  </div>
                  <span
                    className={
                      task.status === "Done"
                        ? "pill done"
                        : task.status === "In Progress"
                          ? "pill in-progress"
                          : "pill todo"
                    }
                  >
                    {task.status}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="pricing-grid" id="pricing">
          <article className="price-card featured-price">
            <p className="eyebrow">Free</p>
            <h3>Khởi động nhanh</h3>
            <p>
              Phù hợp team nhỏ, thử nghiệm quy trình và lưu tài khoản cơ bản.
            </p>
            <strong>0đ</strong>
            <ul>
              <li>3 projects</li>
              <li>Unlimited tasks</li>
              <li>Shared vault basics</li>
            </ul>
          </article>
          <article className="price-card premium-card">
            <p className="eyebrow">Premium</p>
            <h3>Nâng cấp năng suất</h3>
            <p>
              Cho doanh nghiệp cần tự động hóa, nhiều quyền và hỗ trợ tốt hơn.
            </p>
            <strong>99.000đ/tháng</strong>
            <ul>
              <li>Unlimited projects</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
            </ul>
          </article>
        </section>

        <section className="cta-card">
          <div>
            <p className="eyebrow">Sẵn sàng triển khai</p>
            <h2>Đưa TaskHub vào quy trình làm việc của bạn ngay hôm nay.</h2>
            <p>
              Giao diện này có thể kết nối trực tiếp với backend hiện có để xử
              lý đăng nhập, project, task và subscription.
            </p>
          </div>
          <button type="button" className="primary-btn">
            Liên hệ team
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
