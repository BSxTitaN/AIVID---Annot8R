import { randomBytes } from 'crypto'

export class SlugService {
  private static readonly SLUG_LENGTH = 12
  private static readonly SLUG_CHARACTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  
  static generateSlug(): string {
    const timestamp = Date.now().toString(36)
    const randomStr = randomBytes(this.SLUG_LENGTH)
      .toString('hex')
      .slice(0, this.SLUG_LENGTH)
    
    return `${timestamp}-${randomStr}`
  }

  // Map to store slug to actual filename mappings
  private static slugMap = new Map<string, string>()

  static setSlugMapping(slug: string, filename: string) {
    this.slugMap.set(slug, filename)
  }

  static getFilenameFromSlug(slug: string): string | undefined {
    return this.slugMap.get(slug)
  }
}