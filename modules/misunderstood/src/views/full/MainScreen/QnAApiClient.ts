import { AxiosRequestConfig, AxiosStatic } from 'axios'

const MODULE_URL_PREFIX = '/qna'

class QnAApiClient {
  constructor(private axios: AxiosStatic) { }

  // Preprocessing function to normalize queries
  private preprocessQuery(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
  }

  async get(url: string, config?: AxiosRequestConfig) {
    const res = await this.axios.get(MODULE_URL_PREFIX + url, config)
    return res.data
  }

  getQuestion(id) {
    return this.get(`/questions/${id}`)
  }

  async getQuestions({
    page,
    pageSize,
    question,
    categories
  }: {
    page: number
    pageSize: number
    question?: string
    categories?: { label: string; value: string }[]
  }) {
    // Multi-stage matching strategy for better results
    if (question && question.trim()) {
      const searchStrategies = [
        { question }, // Original query
        { question: this.preprocessQuery(question) }, // Normalized query
        { question: question.toLowerCase() }, // Lowercase
        { question: question.replace(/[?!.]/g, '') } // Remove punctuation only
      ]

      // Try each strategy until we find results
      for (const searchParams of searchStrategies) {
        const params = {
          limit: pageSize,
          offset: page * pageSize,
          question: searchParams.question,
          categories: categories && categories.length ? categories : undefined
        }

        const data = await this.get('/questions', { params })
        const items = data.items.slice(0, pageSize)

        // If we found results, return them
        if (items.length > 0) {
          return {
            ...data,
            items
          }
        }
      }

      // If no results found with any strategy, try without category filters
      const params = {
        limit: pageSize,
        offset: page * pageSize,
        question: this.preprocessQuery(question),
        categories: undefined // Remove category filter for broader search
      }

      const data = await this.get('/questions', { params })
      return {
        ...data,
        items: data.items.slice(0, pageSize)
      }
    }

    // Default behavior for empty queries
    const params = {
      limit: pageSize,
      offset: page * pageSize,
      question: question || undefined,
      categories: categories && categories.length ? categories : undefined
    }

    const data = await this.get('/questions', { params })

    return {
      ...data,
      items: data.items.slice(0, pageSize)
    }
  }

  async getCategories() {
    const { data } = await this.axios.get('/nlu/contexts')
    return data
  }
}

export default QnAApiClient
