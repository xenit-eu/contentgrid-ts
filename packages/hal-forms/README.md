# `@contentgrid/hal-forms`

Typescript models for reading the [HAL-FORMS](https://rwcbook.github.io/hal-forms/) format.

## Usage

The typical entrypoint for this library is `resolveTemplate` (or `resolveTemplateRequired` if you want an exception when a template is missing).

<details>

<summary>Code example for using `resolveTemplate`</summary>

```typescript
import { resolveTemplateRequired } from "@contentgrid/hal-forms"
import { HalFormsTemplateShape } from "@contentgrid/hal-forms/shape"
import { HalObjectShape } from "@contentgrid/hal/shape"

namespace myLibrary {
    export const response: HalObjectShape<{
        _templates?: {
            search?: HalFormsTemplateShape
        }
    }> = {
        _templates: {
            search: {
                method: "GET",
                target: "http://localhost/gifts/search",
                properties: [
                    {
                        name: "name",
                        required: true
                    }
                ]
            }
        }
    }
}


const template = resolveTemplateRequired(myLibrary.response, "search");

template.properties.forEach(property => {
    console.log(`Parameter: ${property.name}`)
})

```

</details>

### Shapes

The `@contentgrid/hal-forms/shape` sub-package provides POJO (plain old javascript object) types that can be used to represent the raw HAL-FORMS JSON data.

When using these shapes to define the response schema, `HalFormsTemplateShape` can take type parameters which determine the shape of the expected request and response bodies.

These types can be combined with `@contentgrid/typed-fetch` to statically type the expected request and response bodies for the form.

<details>

<summary>Code example for using shapes</summary>

```typescript
import { HalSlice } from "@contentgrid/hal";
import { resolveTemplateRequired } from "@contentgrid/hal-forms"
import { HalFormsTemplateShape } from "@contentgrid/hal-forms/shape"
import { HalObjectShape, HalSliceShape } from "@contentgrid/hal/shape"
import { fetch, createRequest, Representation } from "@contentgrid/typed-fetch"

namespace myLibrary {

    export interface Gift {
        id: number;
        name: string;
    }

    export interface GiftSearchRequest {
        name?: string;
    }

    export type GiftSearchResponse = HalSliceShape<Gift>;

    export const response: HalObjectShape<{
        _templates?: {
            search?: HalFormsTemplateShape<GiftSearchRequest, GiftSearchResponse>
        }
    }> = {
        _templates: {
            search: {
                method: "GET",
                target: "http://localhost/gifts/search",
                properties: [
                    {
                        name: "name",
                        required: true
                    }
                ]
            }
        }
    }
}

const template = resolveTemplateRequired(myLibrary.response, "search");

const request = createRequest(template.request, {
    body: Representation.json({
        name: "My friend"
    })
});

(async () => {
    const response = await fetch(request);
    if(response.ok) {
        const jsonData = await response.json();
        const page = new HalSlice(jsonData);
        page.items.forEach(item => {
            console.log(item.data.name);
        })
    }

})();
```


### HAL-FORMS builder

In case you want to use the HAL-FORMS models to build your forms, but the API you're using does not have a HAL-FORMS template, you can construct a template by using `@contentgrid/hal-forms/builder`

<details>

<summary>Code example for using HAL-FORMS builder</summary>

```typescript
import buildHalForm from "@contentgrid/hal-forms/builder"

const template = buildHalForm("GET", "http://localhost/gifts/search")
    .addProperty("name", property => property.withType("text").withRequired(true));

template.properties.forEach(property => {
    console.log(`Parameter: ${property.name}`)
})

```

</details>
