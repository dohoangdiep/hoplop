import { Link, useParams } from 'react-router-dom'

/** Trang tạm cho các màn hình sẽ làm ở bước sau của Đợt 1. */
export function SapCo({ tieuDe, moTa }: { tieuDe: string; moTa: string }) {
  const { ma } = useParams()
  return (
    <main style={{ fontFamily: 'Be Vietnam Pro, system-ui, sans-serif', maxWidth: 520, margin: '0 auto', padding: '64px 24px', color: '#22203A' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>{tieuDe}</h1>
      <p style={{ color: '#5C5873', lineHeight: 1.6 }}>{moTa}</p>
      <Link to={ma ? `/${ma}` : '/'} style={{ color: '#5B3FD6', fontWeight: 600 }}>
        {ma ? 'Quay lại trang lớp' : 'Về trang chủ'}
      </Link>
    </main>
  )
}
