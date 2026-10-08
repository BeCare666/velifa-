import { ThemeToggle } from '@/components/ThemeToggle';

export default function DesignPage() {
  return (
    <main style={{ padding: '3rem 2rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <section>
          <p className="velifa-eyebrow">Design System</p>
          <h1 className="velifa-wordmark" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            VELIFA
          </h1>
          <p className="velifa-eyebrow" style={{ marginTop: '0.5rem' }}>Performance Beyond Limits</p>
          <hr className="velifa-divider" style={{ marginTop: '1.5rem' }} />
        </section>

        <section>
          <h2>Theme Toggle</h2>
          <div className="velifa-card" style={{ display: 'inline-flex' }}>
            <ThemeToggle />
          </div>
        </section>

        <section>
          <h2>Buttons</h2>
          <div className="velifa-card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="velifa-btn">Primary Button</button>
            <button className="velifa-btn velifa-btn--ghost">Ghost Button</button>
          </div>
        </section>

        <section>
          <h2>Card</h2>
          <div className="velifa-card">
            <h3 style={{ marginTop: 0 }}>Sample Card</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
              This is a velifa-card with a dark surface and gold border accent.
            </p>
          </div>
        </section>

        <section>
          <h2>Score Colors</h2>
          <div className="velifa-card" style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <span className="score-good" style={{ fontSize: '1.5rem', fontWeight: 700 }}>92</span>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.75rem' }}>score-good</p>
            </div>
            <div>
              <span className="score-average" style={{ fontSize: '1.5rem', fontWeight: 700 }}>65</span>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.75rem' }}>score-average</p>
            </div>
            <div>
              <span className="score-poor" style={{ fontSize: '1.5rem', fontWeight: 700 }}>34</span>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.75rem' }}>score-poor</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}