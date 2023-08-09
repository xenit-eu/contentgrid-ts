# `@contentgrid/uri-template`

[RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) compliant URI template parser and expander.

## Usage

```typescript
import UriTemplate from '@contentgrid/uri-template'

const template = new UriTemplate("http://example.com/{resource}/search{?color,height}");


// Expand using named keys
template.expand({ resource: "cars" }) // -> "http://example.com/cars/search"

// Expand using positional keys
template.expand(["cars", "blue"]) // -> "http://example.com/cars/search?color=blue"

// Parsing URLs
template.match("http://example.com/cars/search") // -> { resource: "cars" }
template.match("http://example.org/something-else") // -> null

```
