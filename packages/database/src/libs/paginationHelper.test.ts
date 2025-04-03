import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPaginatedData } from './paginationHelper.js'
import { DatabaseService } from '../databaseService.js'
import { Request } from 'express'
import { Collection } from 'mongodb'

// Define test suite for the getPaginatedData function
describe('getPaginatedData', () => {
  // Setup variables to simulate a MongoDB collection and an Express request
  let fakeCollection: Partial<Collection>
  let req: Partial<Request>

  // Sample data to be used for testing, representing books data
  const sampleBooks: any[] = [
    {
      id: 'book2',
      title: 'Another Book',
      author: 'Another Author',
      publicationYear: 2020,
      publisher: 'Publisher 2',
      price: 15,
    },
  ]

  // Extra paginated information to simulate response structure
  const paginationData = {
    data: sampleBooks,
    pagination: {
      page: 1,
      limit: 10,
      total: 8,
      pages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }

  // Before each test, initialize fakeCollection, request, and mock the paginateCollection function
  beforeEach(() => {
    fakeCollection = {}
    req = {
      pagination: { page: 1, limit: 10 },
    }

    // Mocking DatabaseService.paginateCollection to return the predefined paginationData
    vi.spyOn(DatabaseService, 'paginateCollection').mockResolvedValue(
      paginationData,
    )
  })

  // After each test, restore all mocks to avoid side effects
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test to check if DatabaseService.paginateCollection is called with correct arguments
  it('should call DatabaseService.paginateCollection with correct arguments', async () => {
    const query = { title: { $regex: /test/i } }
    const options = {
      projection: { _id: 0 },
    }

    // Call getPaginatedData with query and options
    const result = await getPaginatedData(
      fakeCollection as Collection,
      query,
      req as Request,
      options,
    )

    // Verify that paginateCollection was called with the correct parameters
    expect(DatabaseService.paginateCollection).toHaveBeenCalledWith(
      fakeCollection,
      query,
      { page: 1, limit: 10 },
      options,
    )

    // Verify that the function returns the expected pagination data
    expect(result).toEqual(paginationData)
  })

  // Test to check if getPaginatedData handles undefined query and options by using default values
  it('should use empty query and options if not provided', async () => {
    // Call getPaginatedData without query and options
    const result = await getPaginatedData(
      fakeCollection as Collection,
      undefined,
      req as Request,
    )

    // Verify that paginateCollection was called with an empty query object and undefined options
    expect(DatabaseService.paginateCollection).toHaveBeenCalledWith(
      fakeCollection,
      {},
      { page: 1, limit: 10 },
      undefined,
    )

    // Verify that the function returns the expected pagination data
    expect(result).toEqual(paginationData)
  })
})
