export default function PlaceholderPage({ title, description }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>{description}</p>

      <div className="placeholder-card">
        <p>This page is ready for dashboard components.</p>
      </div>
    </section>
  );
}