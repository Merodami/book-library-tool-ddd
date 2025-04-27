import { schemas } from '@book-library-tool/api'
import type { DomainBook } from '@books/domain/index.js'
import { BookWriteProjectionRepository } from '@books/infrastructure/index.js'
import { ObjectId } from 'mongodb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('BookWriteProjectionRepository', () => {
  let mockColl: any
  let repository: BookWriteProjectionRepository
  let domain: DomainBook
  let id: string

  beforeEach(() => {
    id = new ObjectId().toString()
    domain = {
      id,
      isbn: 'isbn',
      title: 't',
      author: 'a',
      publicationYear: 2000,
      publisher: 'p',
      price: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockColl = {
      insertOne: vi.fn().mockResolvedValue({ insertedId: id }),
      updateOne: vi
        .fn()
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    }
    repository = new BookWriteProjectionRepository(mockColl as any)
  })

  afterEach(() => vi.clearAllMocks())

  it('saveBookProjection() inserts', async () => {
    await repository.saveBookProjection(domain)

    expect(mockColl.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        isbn: domain.isbn,
        title: domain.title,
      }),
    )
  })

  it('updateBookProjection() sets only changed fields + updatedAt', async () => {
    const update: schemas.BookUpdateRequest = { title: 'new' }
    const when = new Date()

    await repository.updateBookProjection(id, update, when)

    expect(mockColl.updateOne).toHaveBeenCalledWith(
      { id, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
      { $set: { title: 'new', updatedAt: when } },
    )
  })

  it('markAsDeleted() adds deletedAt & updatedAt', async () => {
    const when = new Date()

    await repository.markAsDeleted(id, when)

    expect(mockColl.updateOne).toHaveBeenCalledWith(
      { id, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
      { $set: { deletedAt: when, updatedAt: when } },
    )
  })
})
