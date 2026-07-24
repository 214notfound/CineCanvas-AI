import { Link } from 'react-router-dom'

export default function WorkspacePage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center bg-maroon-deep px-6 text-center">
      <h1 className="font-display text-4xl font-bold text-cream text-shadow-paper sm:text-5xl">
        工作台 (Workspace)
      </h1>
      <Link
        to="/"
        className="mt-8 inline-block font-serif-sc text-lg text-gold underline-offset-4 hover:underline"
      >
        ← 返回首页 / Back to Home
      </Link>
    </main>
  )
}
