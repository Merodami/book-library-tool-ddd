import { defineConfig } from '@graphql-mesh/compose-cli'
import { loadOpenAPISubgraph } from '@omnigraph/openapi'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('LibraryAPI', {
        source: '../api/dist/openapi.json',
      }),
    },
  ],
})
