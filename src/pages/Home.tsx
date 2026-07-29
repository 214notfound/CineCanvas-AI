import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center bg-maroon-deep px-6 text-center">
      <h1 className="font-display text-6xl font-bold text-cream text-shadow-paper sm:text-7xl">
        CineCanvas
      </h1>
      <p className="mt-4 font-serif-sc text-xl text-gold sm:text-2xl">
        在实践中学调色
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/learn"
          className="inline-block rounded-sm bg-gold px-8 py-3 font-serif-sc text-lg text-ink transition-colors hover:brightness-110"
        >
          辨析课程
        </Link>
        <Link
          to="/analyze"
          className="inline-block rounded-sm bg-paper px-8 py-3 font-serif-sc text-lg text-maroon transition-colors hover:bg-cream"
        >
          分析我的照片
        </Link>
        <Link
          to="/workspace"
          className="inline-block rounded-sm border border-paper-dim px-8 py-3 font-serif-sc text-lg text-paper transition-colors hover:bg-maroon"
        >
          工作台
        </Link>
      </div>
    </main>
  )
}
