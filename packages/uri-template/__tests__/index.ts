import { test, expect, describe } from "@jest/globals"
import UriTemplate from "../index"

describe('URI template with multiple variables', () => {
    var template = new UriTemplate("/abc/{var1}{?var2,var3}");

    test('knows the variable names', () => {
        expect(template.variables).toEqual(['var1', 'var2', 'var3']);
    })

    test('expands by name', () => {
        expect(template.expand({'var1': 'ZZ', 'var3': 'ff'})).toEqual("/abc/ZZ?var3=ff");
    })

    test('expands by position', () => {
        expect(template.expand(['ZZ'])).toEqual("/abc/ZZ");
    })

    test('matches a path to variables', () => {
        expect(template.match('/abc/XY?var2=x')).toEqual({
            'var1': 'XY',
            'var2': 'x'
        })
    })

    test('fails to match non-matching path', () => {
        expect(template.match('/ab/XX')).toBe(null);
    })
})
