import { useEffect, useMemo, useState } from 'react'
import type { LessonQuiz, LessonQuizOption } from '@/data/lessons/types'
import { mergeRecipe } from '@/data/lessons/types'
import { gradeImageData, loadImageData } from '@/lib/gradeImageData'

interface LessonQuizProps {
  imageSrc: string
  quiz: LessonQuiz
  onComplete: () => void
}

/** Fisher–Yates shuffle (copy). */
function shuffleOptions(options: LessonQuizOption[]): LessonQuizOption[] {
  const out = [...options]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * A/B(/C) identification quiz. Thumbnails are rendered with the CPU grading
 * mirror from hidden recipes — no AI, no heatmap.
 * Option order is shuffled each mount so A≠「第一项配方」.
 */
export function LessonQuizPanel({ imageSrc, quiz, onComplete }: LessonQuizProps) {
  const [source, setSource] = useState<ImageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState<LessonQuizOption[]>(() =>
    shuffleOptions(quiz.options),
  )

  useEffect(() => {
    setShuffledOptions(shuffleOptions(quiz.options))
    setAnswers({})
    setSubmitted(false)
  }, [quiz])

  useEffect(() => {
    let cancelled = false
    setSource(null)
    setError(null)
    // 720px long edge: sharp enough in the quiz grid, still cheap for CPU grade.
    void loadImageData(imageSrc, 720)
      .then((data) => {
        if (!cancelled) setSource(data)
      })
      .catch(() => {
        if (!cancelled) {
          setError('诊断图加载失败（请确认 public/learn 下为小写 .jpg 文件名）')
        }
      })
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  const thumbnails = useMemo(() => {
    if (!source) return null
    return shuffledOptions.map((opt) => ({
      id: opt.id,
      label: opt.revealLabel,
      image: gradeImageData(source, mergeRecipe(opt.recipe)),
    }))
  }, [source, shuffledOptions])

  const allAnswered = quiz.questions.every((q) => answers[q.id])
  const score = quiz.questions.reduce((n, q) => {
    return n + (answers[q.id] === q.correctOptionId ? 1 : 0)
  }, 0)
  const perfect = submitted && score === quiz.questions.length

  return (
    <section className="rounded-lg border border-paper-dim/30 bg-film/50 p-4">
      <h2 className="font-display text-xl text-cream">辨认题</h2>
      <p className="mt-1 font-serif-sc text-sm text-paper-dim">{quiz.intro}</p>

      {error && <p className="mt-3 font-sans text-sm text-crimson">{error}</p>}
      {!source && !error && (
        <p className="mt-3 font-sans text-sm text-paper-dim">正在渲染对比图…</p>
      )}

      {thumbnails && (
        <div
          className={`mt-4 grid gap-3 ${
            thumbnails.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
          }`}
        >
          {thumbnails.map((t, i) => (
            <figure key={t.id} className="overflow-hidden rounded-md bg-film">
              <QuizThumb
                image={t.image}
                alt={`选项 ${String.fromCharCode(65 + i)}`}
              />
              <figcaption className="px-2 py-1.5 font-sans text-xs text-paper-dim">
                选项 {String.fromCharCode(65 + i)}
                {submitted ? (
                  <span className="mt-0.5 block text-gold">{t.label}</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {quiz.questions.map((q) => (
          <fieldset key={q.id} className="rounded-md border border-paper-dim/25 p-3">
            <legend className="px-1 font-serif-sc text-sm text-cream">{q.prompt}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {shuffledOptions.map((opt, i) => {
                const letter = String.fromCharCode(65 + i)
                const selected = answers[q.id] === opt.id
                const correct = opt.id === q.correctOptionId
                const showMark = submitted
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={submitted}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                    }
                    className={[
                      'rounded border px-3 py-1.5 font-sans text-sm transition-colors',
                      selected
                        ? 'border-gold bg-gold/20 text-gold'
                        : 'border-paper-dim/40 text-paper hover:bg-maroon',
                      showMark && correct ? 'ring-1 ring-gold' : '',
                      showMark && selected && !correct
                        ? 'opacity-60 line-through'
                        : '',
                      'disabled:cursor-default',
                    ].join(' ')}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <p className="mt-2 font-sans text-xs text-paper-dim">
                {answers[q.id] === q.correctOptionId ? '正确' : '再看一眼揭晓标签'}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            disabled={!allAnswered || !thumbnails}
            onClick={() => setSubmitted(true)}
            className="rounded-sm bg-gold px-5 py-2 font-serif-sc text-ink disabled:opacity-40"
          >
            提交答案
          </button>
        ) : (
          <>
            <p className="font-serif-sc text-sm text-cream">
              {score}/{quiz.questions.length} 题正确
              {perfect ? ' · 过关！' : ' · 可再练一轮或继续'}
            </p>
            {!perfect && (
              <button
                type="button"
                onClick={() => {
                  setShuffledOptions(shuffleOptions(quiz.options))
                  setAnswers({})
                  setSubmitted(false)
                }}
                className="rounded border border-paper-dim px-3 py-1.5 font-sans text-sm text-paper hover:bg-maroon"
              >
                再试一次
              </button>
            )}
            <button
              type="button"
              onClick={onComplete}
              className="rounded-sm bg-paper px-5 py-2 font-serif-sc text-maroon hover:bg-cream"
            >
              {perfect ? '完成本关' : '先记下答案，完成本关'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function QuizThumb({ image, alt }: { image: ImageData; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.putImageData(image, 0, 0)
    // PNG avoids extra JPEG mush on already-downsampled thumbs.
    const next = canvas.toDataURL('image/png')
    setUrl(next)
  }, [image])

  if (!url) {
    return <div className="aspect-[3/2] w-full animate-pulse bg-film" aria-label={alt} />
  }
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-[3/2] w-full object-cover"
      decoding="async"
    />
  )
}
