### ATAG Data types

These are the possible data types for the [Property Configurations of Collections and Annotations](./customization.md#property-configuration).

For mapping between JavaScript and Cypher data types, see the [official Neo4j manual](https://neo4j.com/docs/javascript-manual/current/data-types/).

| Type        | Specific Keywords                                            |
| ----------- | ------------------------------------------------------------ |
| `array`     | `items`, `minItems`, `maxItems`                              |
| `boolean`   |                                                              |
| `date`      |                                                              |
| `date-time` |                                                              |
| `integer`   | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` |
| `number`    | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` |
| `string`    | `minLength`, `maxLength`, `options`, `template`              |
| `time`      |                                                              |

### Specific keywords that should be explained

- `items`: Property configuration that applies to each array element. Structured exactly like any other property configuration
- `options`: Fixed selection options for simple data types, rendered as dropdown. Can be either of type `number` or `string`
- `template`: `input` or `textarea`. Specifies the HTML input type in the form. Purely visual configuration entry

### Components

Each type gets its own input component. If the type is `array`, the component is rendered for each entry.

| Type        | Component                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------- |
| `boolean`   | [Checkbox](https://primevue.org/checkbox/)                                                |
| `date`      | [DatePicker](https://primevue.org/datepicker/)                                            |
| `date-time` | [DatePicker](https://primevue.org/datepicker/)                                            |
| `integer`   | [InputNumber](https://primevue.org/inputnumber/)                                          |
| `number`    | [InputNumber](https://primevue.org/inputnumber/)                                          |
| `string`    | [InputText](https://primevue.org/inputtext/) / [Textarea](https://primevue.org/textarea/) |
| `time`      | [DatePicker](https://primevue.org/datepicker/)                                            |
