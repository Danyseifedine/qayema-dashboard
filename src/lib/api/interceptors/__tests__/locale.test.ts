import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it } from 'vitest'
import { installLocaleInterceptor } from '@/lib/api/interceptors/locale'
import { i18n } from '@/lib/i18n'

describe('installLocaleInterceptor', () => {
  const client = axios.create()
  const mock = new MockAdapter(client)

  afterEach(async () => {
    mock.reset()
    client.interceptors.request.clear()
    await i18n.changeLanguage('en')
  })

  it('sends the language the dashboard is showing', async () => {
    installLocaleInterceptor(client)
    mock.onGet('/api/user').reply(200, {})

    await client.get('/api/user')
    expect(mock.history.get[0]!.headers?.['Accept-Language']).toBe('en')

    await i18n.changeLanguage('ar')
    await client.get('/api/user')
    expect(mock.history.get[1]!.headers?.['Accept-Language']).toBe('ar')
  })
})
