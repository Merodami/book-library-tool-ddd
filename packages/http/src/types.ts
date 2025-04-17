export interface ApiTokenOptions {
  /**
   * The secret key used to verify the API token.
   */
  secret: string

  /**
   * The name of the header that contains the API token.
   */
  headerName?: string

  /**
   * The paths that should be excluded from authentication.
   */
  excludePaths?: string[]
}
