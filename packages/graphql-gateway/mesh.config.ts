import { defineConfig } from '@graphql-mesh/compose-cli'
import { loadOpenAPISubgraph } from '@omnigraph/openapi'

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('LibraryAPI', {
        source: '../api/dist/openapi.json',
        // Pending to mutate queries GET
        // selectQueryOrMutationField: [
        //   {
        //     fieldName: 'add_weather_forecast', // OAS field name
        //     type: 'Query' // switch method POST from default Mutation into Query
        //   },
        //   {
        //     fieldName: 'get_weather_forecast', // OAS field name
        //     type: 'Mutation' // switch method GET from default Query into Mutation
        //   }
        // ]
      }),
    },
  ],
})
