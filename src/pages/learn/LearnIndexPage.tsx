import { Link } from 'react-router-dom'
import { listLessons } from '@/data/lessons'
import { getCompletedLessonIds } from '@/lib/lessonProgress'

/**
 * Course directory for mechanism-layer lessons (P1.2).
 */
export default function LearnIndexPage() {
  const lessons = listLessons()
  const done = new Set(getCompletedLessonIds())

  return (
    <main className="min-h-full bg-maroon-deep px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-sans text-xs tracking-wide text-gold/80">
              P1 · 第一层机制
            </p>
            <h1 className="font-display text-3xl font-bold text-cream text-shadow-paper">
              辨析课程
            </h1>
            <p className="mt-2 max-w-xl font-serif-sc text-sm text-paper-dim">
              用固定诊断图感受参数区别：练习拖滑块 → 直方图与闪回 → 辨认题通关。
              不依赖 AI，也不进工作台。
            </p>
          </div>
          <div className="flex gap-4 font-serif-sc text-gold">
            <Link to="/learn/lab" className="underline-offset-4 hover:underline">
              实验室
            </Link>
            <Link to="/" className="underline-offset-4 hover:underline">
              首页
            </Link>
          </div>
        </div>

        <ol className="space-y-3">
          {lessons.map((lesson, i) => {
            const complete = done.has(lesson.id)
            return (
              <li key={lesson.id}>
                <Link
                  to={`/learn/lessons/${lesson.id}`}
                  className="block rounded-lg border border-paper-dim/30 bg-film/40 px-4 py-4 transition-colors hover:border-gold/50 hover:bg-film/70"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-sans text-xs text-gold/80">
                      第 {i + 1} 关
                      {complete ? ' · 已完成' : ''}
                    </p>
                    {complete && (
                      <span className="font-sans text-[10px] text-gold">✓</span>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-xl text-cream">
                    {lesson.title}
                  </h2>
                  <p className="mt-1 font-serif-sc text-sm text-paper-dim">
                    {lesson.blurb}
                  </p>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </main>
  )
}
