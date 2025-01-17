import { SKIP } from "../constants";
import {
    invariant,
    isPropSchema,
    isAliasedPropSchema,
    parallel,
    processAdditionalPropArgs,
} from "../utils/utils";
import { onAfterDeserialize, onBeforeDeserialize } from "../core/deserialize";
import { _defaultPrimitiveProp } from "../constants";
import { AdditionalPropArgs, PropSchema } from "../api/types";

/**
 * List indicates that this property contains a list of things.
 * Accepts a sub model schema to serialize the contents
 *
 * @example
 * class SubTask {}
 * class Task {}
 * class Todo {}
 *
 * createModelSchema(SubTask, {
 *     title: true,
 * })
 * createModelSchema(Todo, {
 *     title: true,
 *     subTask: list(object(SubTask)),
 * })
 *
 * const todo = deserialize(Todo, {
 *     title: 'Task',
 *     subTask: [
 *         {
 *             title: 'Sub task 1',
 *         },
 *     ],
 * })
 *
 * @param propSchema to be used to (de)serialize the contents of the array
 * @param additionalArgs optional object that contains beforeDeserialize and/or afterDeserialize handlers
 */
export default function list(
    propSchema: PropSchema,
    additionalArgs?: AdditionalPropArgs
): PropSchema {
    propSchema = propSchema || _defaultPrimitiveProp;
    invariant(isPropSchema(propSchema), "expected prop schema as first argument");
    invariant(
        !isAliasedPropSchema(propSchema),
        "provided prop is aliased, please put aliases first"
    );
    let result: PropSchema = {
        serializer: function (ar) {
            if (ar === undefined) {
                return SKIP;
            }
            invariant(ar && "length" in ar && "map" in ar, "expected array (like) object");
            return ar.map(propSchema.serializer);
        },
        deserializer: function (jsonArray, done, context) {
            if (!Array.isArray(jsonArray)) return void done("[serializr] expected JSON array");

            function processItem(
                jsonValue: any,
                onItemDone: (err?: any, value?: any) => void,
                itemIndex: number
            ) {
                function callbackBefore(err: any, value: any) {
                    if (!err) {
                        propSchema.deserializer(value, deserializeDone, context);
                    } else {
                        onItemDone(err);
                    }
                }

                function deserializeDone(err: any, value: any) {
                    if (typeof propSchema.afterDeserialize === "function") {
                        onAfterDeserialize(
                            onItemDone,
                            err,
                            value,
                            jsonValue,
                            jsonArray,
                            itemIndex,
                            context,
                            propSchema
                        );
                    } else {
                        onItemDone(err, value);
                    }
                }

                onBeforeDeserialize(
                    callbackBefore,
                    jsonValue,
                    jsonArray,
                    itemIndex,
                    context,
                    propSchema
                );
            }

            parallel(jsonArray, processItem, (err, result2) => {
                if (err) {
                    return void done(err);
                }
                done(
                    undefined,
                    result2!.filter((x) => SKIP !== x)
                );
            });
        },
    };
    result = processAdditionalPropArgs(result, additionalArgs);
    return result;
}
