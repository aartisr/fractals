import { component$, useComputed$ } from '@builder.io/qwik'
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city'
import { payload } from '~/utils/payload-sdk'

type LegalPage = {
  title: string
  slug: string
  summary?: string
  body: string
  metaTitle?: string
  metaDescription?: string
}

export const useLegalPageLoader = routeLoader$(async ({ params, status }) => {
  const slug = params.slug
  if (!slug) {
    status(404)
    return null
  }

  const result = await payload.find({
    collection: 'legal-pages',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    depth: 0,
  })

  if (!result.docs.length) {
    status(404)
    return null
  }

  return result.docs[0] as LegalPage
})

export default component$(() => {
  const page = useLegalPageLoader()

  const paragraphs = useComputed$(() => {
    const body = page.value?.body || ''
    return body
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
  })

  if (!page.value) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div class="text-center">
          <h1 class="text-3xl font-bold">Page not found</h1>
          <p class="text-gray-600">The document you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-8 lg:p-12 space-y-6">
        <div>
          <p class="text-sm uppercase tracking-[0.5em] text-orange-500">Legal</p>
          <h1 class="text-4xl font-bold text-gray-900 mt-2" style="line-height:1.2">
            {page.value.title}
          </h1>
          {page.value.summary && (
            <p class="text-gray-600 mt-3 text-lg">
              {page.value.summary}
            </p>
          )}
        </div>
        <div class="prose prose-orange max-w-none text-gray-800 space-y-6">
          {paragraphs.value.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const page = resolveValue(useLegalPageLoader)
  if (!page) {
    return {
      title: 'Legal Information - Nithyananda TV',
      meta: [
        {
          name: 'description',
          content: 'Legal documents for Nithyananda TV.',
        },
      ],
    }
  }

  return {
    title: page.metaTitle || page.title,
    meta: [
      {
        name: 'description',
        content: page.metaDescription || page.summary || 'Official legal information from Nithyananda TV.',
      },
    ],
  }
}
