import { Book } from '@book-library-tool/sdk'
import he from 'he'

/**
 * Decode a string from latin1 to utf8.
 * This function helps fix mis‐encoded text (e.g. "TÃ?Â¶dliche LÃ?Â¼gen." becomes "Tödliche Lügen.").
 */
export function decodeText(text: string): string {
  return Buffer.from(text, 'latin1').toString('utf8')
}

/**
 * Decode HTML entities using Lodash's unescape.
 * This will convert "&amp;" to "&", etc.
 */
export function decodeHTMLEntities(text: string): string {
  return he.decode(text)
}

export const isInvalidBook = (book: Book) => {
  return (
    book.id === undefined ||
    book.id === null ||
    book.id === '' ||
    book.title === undefined ||
    book.title === null ||
    book.title === '' ||
    book.author === undefined ||
    book.author === null ||
    book.author === '' ||
    book.publicationYear === undefined ||
    book.publicationYear === null
  )
}
