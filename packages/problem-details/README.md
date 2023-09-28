# `@contentgrid/problem-details`

[RFC 9457](https://datatracker.ietf.org/doc/html/rfc9567) Problem Details types and helpers

## Usage

```typescript
import { ProblemDetail, ProblemDetailError, checkResponse } from '@contentgrid/problem-details'

// Fetch data from somewhere
fetch('/some-url')
    .then(checkResponse) // Throws ProblemDetailError if an error response is returned
    .then(response => {
        // Handle succesfull response
    }, error => {
        // Handle error response
        if(error instanceof ProblemDetailError) {
            // ProblemDetail is available on the ProblemDetailError
            console.error("Failed to fetch", error.problemDetail.title)
        } else {
            console.error("Failed to fetch", error);
        }
    })
```
