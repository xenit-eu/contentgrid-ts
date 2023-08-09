# `@contentgrid/hal`

Typescript models for reading the [HAL+json](https://datatracker.ietf.org/doc/html/draft-kelly-json-hal) format.

HAL links and embedded objects are aware of [CURIEs](https://www.w3.org/TR/2010/NOTE-curie-20101216/) and can resolve them using extended link relations.

## Usage

The typical entrypoints for this library is `HalObject`.

A `HalObject` is constructed from the HAL+json response body and can be used to links, embedded objects and the original data.

For convenience, there is also a `HalSlice` object that can be used to more easily access paginated data.
This assumes that standard link relations are used for pagination and that items on a page are `_embedded`.

<details>
<summary>Code example using `HalObject` and `HalSlice`</summary>


```typescript
import { HalObject, HalSlice } from '@contentgrid/hal';
import { HalObjectShape, HalSliceShape } from '@contentgrid/hal/shape';
import { createRelation } from '@contentgrid/hal/rels';

namespace myLibrary {

    export interface Gift {
        id: number;
        name: string;
    }

    export const objectData: HalObjectShape<Gift> = {
        id: 1,
        name: "Parachute",
        _links: {
            self: {
                href: "http://localhost/gifts/1"
            }
        }
    };

    export const sliceData: HalSliceShape<Gift> = {
        "_embedded": {
            "gifts": [
                objectData
            ]
        },
        "_links": {
            self: {
                href: "http://localhost/gifts?page=2"
            },
            first: {
                href: "http://localhost/gifts"
            },
            previous: {
                href: "http://localhost/gifts?page=1"
            },
            next: {
                href: "http://localhost/gifts?page=3"
            }
        }
    };
}

const object = new HalObject(myLibrary.objectData);

const selfLink = object.links.requireSingleLink(createRelation("self"));

console.log(selfLink);

var page = new HalSlice(myLibrary.sliceData);

for(const item of page.items) {
    console.log(item.self.href);
}

console.log("Next page:", page.next?.href)
console.log("Previous page:", page.previous?.href)
```

</details>

### Link relations and CURIEs

In HAL, the keys for both `_links` and `_embedded` are [RFC8288 link relation types](https://datatracker.ietf.org/doc/html/rfc8288) or [CURIEs](https://www.w3.org/TR/2010/NOTE-curie-20101216/).

The internal representation of this library can work with both, but accessing links (or embedded objects) is only possible with a link relation type (`LinkRelation`), not with a `CURIE`. This is because a CURIE is not a stable representation, as its prefix freely be changed.

The `@contentgrid/hal/rels` sub-package provides methods to work with link relations.

All [IANA-registered link relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml) are available in the `ianaRelations` object.

Custom objects with extended `LinkRelation`s can be created with the `createRelations()` function.

Utilities to work directly with CURIEs are available in the `@contentgrid/hal/curies` sub-package, but these functions are mostly for internal usage.

### Shapes

The `@contentgrid/hal/shapes` sub-package provides POJO (plain old javascript object) types that can be used to represent the raw HAL JSON data.
