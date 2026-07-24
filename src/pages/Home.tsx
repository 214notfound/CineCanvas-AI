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
      <Link
        to="/workspace"
        className="mt-10 inline-block rounded-sm bg-paper px-8 py-3 font-serif-sc text-lg text-maroon transition-colors hover:bg-cream"
      >
        进入工作台 / Select Your Film
      </Link>
    </main>
  )
}
