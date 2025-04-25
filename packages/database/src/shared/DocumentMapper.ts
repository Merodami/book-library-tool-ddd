/**
 * Generic document mapper function type
 */
export type DocumentMapper<TDocument, TDto> = (doc: Partial<TDocument>) => TDto
