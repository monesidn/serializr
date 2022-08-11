/*
 * Update
 */

import { invariant, isModelSchema, GUARDED_NOOP } from "../utils/utils";
import getDefaultModelSchema from "../api/getDefaultModelSchema";
import Context from "./Context";
import { deserializePropsWithSchema } from "./deserialize";
import { ClazzOrModelSchema } from "../api/types";

/**
 * Similar to deserialize, but updates an existing object instance.
 * Properties will always updated entirely, but properties not present in the json will be kept as is.
 * Further this method behaves similar to deserialize.
 *
 * @param modelSchema, optional if it can be inferred from the instance type
 * @param target target instance to update
 * @param json the json to deserialize
 * @param callback the callback to invoke once deserialization has completed.
 * @param customArgs custom arguments that are available as `context.args` during the deserialization process. This can be used as dependency injection mechanism to pass in, for example, stores.
 * @returns deserialized object, possibly incomplete.
 */
export default function update<T>(
    modelschema: ClazzOrModelSchema<T>,
    instance: T,
    json: any,
    callback?: (err: any, result: T) => void,
    customArgs?: any
): void;
export default function update<T>(
    instance: T,
    json: any,
    callback?: (err: any, result: T) => void,
    customArgs?: any
): void;
export default function update(...args: any[]) {
    const inferModelSchema = args.length === 2 || typeof args[2] === "function"; // only target and json // callback as third arg

    let target, modelSchema, json, callback, customArgs;
    if (inferModelSchema) {
        target = args[0];
        modelSchema = getDefaultModelSchema(target);
        json = args[1];
        callback = args[2];
        customArgs = args[3];
    } else {
        modelSchema = getDefaultModelSchema(args[0]);
    }
    invariant(isModelSchema(modelSchema), "update failed to determine schema");
    invariant(
        typeof target === "object" && target && !Array.isArray(target),
        "update needs an object"
    );
    const context = new Context(undefined, modelSchema, json, callback || GUARDED_NOOP, customArgs);
    context.setTarget(target);
    const lock = context.createCallback(GUARDED_NOOP);
    const result = deserializePropsWithSchema(context, modelSchema, json, target);
    lock();
    return result;
}
