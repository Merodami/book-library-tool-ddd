import type { ICatalogRepository } from '@repositories/ICatalogRepository.js'
import type { ListBookCommand } from '@commands/ListBookCommand.js'

export class ListBookHandler {
  constructor(private readonly repository: ICatalogRepository) {}

  /**
   * Retrieves all books from the repository.
   * This method is useful for listing all available books.
   *
   * @returns An array of Book aggregates.
   */
  async execute(command: ListBookCommand): Promise<void> {
    await this.repository.getAllBooks(command)
  }
}
