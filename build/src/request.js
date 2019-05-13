"use strict";
/*!
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const projectify_1 = require("@google-cloud/projectify");
const promisify_1 = require("@google-cloud/promisify");
const arrify = require("arrify");
const concat = require('concat-stream');
const extend = require("extend");
const split_array_stream_1 = require("split-array-stream");
const streamEvents = require("stream-events");
const through = require("through2");
// Import the clients for each version supported by this package.
const gapic = Object.freeze({
    v1: require('./v1'),
});
const entity_1 = require("./entity");
const query_1 = require("./query");
/**
 * A map of read consistency values to proto codes.
 *
 * @type {object}
 * @private
 */
const CONSISTENCY_PROTO_CODE = {
    eventual: 2,
    strong: 1,
};
/**
 * Handle logic for Datastore API operations. Handles request logic for
 * Datastore.
 *
 * Creates requests to the Datastore endpoint. Designed to be inherited by
 * the {@link Datastore} and {@link Transaction} classes.
 *
 * @class
 */
class DatastoreRequest {
    /**
     * Format a user's input to mutation methods. This will create a deep clone of
     * the input, as well as allow users to pass an object in the format of an
     * entity.
     *
     * Both of the following formats can be supplied supported:
     *
     *     datastore.save({
     *       key: datastore.key('Kind'),
     *       data: { foo: 'bar' }
     *     }, (err) => {})
     *
     *     const entity = { foo: 'bar' }
     *     entity[datastore.KEY] = datastore.key('Kind')
     *     datastore.save(entity, (err) => {})
     *
     * @private
     *
     * @see [#1803]{@link https://github.com/GoogleCloudPlatform/google-cloud-node/issues/1803}
     *
     * @param {object} obj The user's input object.
     */
    static prepareEntityObject_(obj) {
        const entityObject = extend(true, {}, obj);
        // Entity objects are also supported.
        if (obj[entity_1.entity.KEY_SYMBOL]) {
            return {
                key: obj[entity_1.entity.KEY_SYMBOL],
                data: entityObject,
            };
        }
        return entityObject;
    }
    allocateIds(key, options, callback) {
        if (entity_1.entity.isKeyComplete(key)) {
            throw new Error('An incomplete key should be provided.');
        }
        options = typeof options === 'number' ? { allocations: options } : options;
        this.request_({
            client: 'DatastoreClient',
            method: 'allocateIds',
            reqOpts: {
                keys: new Array(options.allocations).fill(entity_1.entity.keyToKeyProto(key)),
            },
            gaxOpts: options.gaxOptions,
        }, (err, resp) => {
            if (err) {
                callback(err, null, resp);
                return;
            }
            const keys = arrify(resp.keys).map(entity_1.entity.keyFromKeyProto);
            callback(null, keys, resp);
        });
    }
    /**
     * Retrieve the entities as a readable object stream.
     *
     * @throws {Error} If at least one Key object is not provided.
     *
     * @param {Key|Key[]} keys Datastore key object(s).
     * @param {object} [options] Optional configuration. See {@link Datastore#get}
     *     for a complete list of options.
     *
     * @example
     * const keys = [
     *   datastore.key(['Company', 123]),
     *   datastore.key(['Product', 'Computer'])
     * ];
     *
     * datastore.createReadStream(keys)
     *   .on('error', (err) =>  {})
     *   .on('data', (entity) => {
     *     // entity is an entity object.
     *   })
     *   .on('end', () => {
     *     // All entities retrieved.
     *   });
     */
    createReadStream(keys, options = {}) {
        keys = arrify(keys).map(entity_1.entity.keyToKeyProto);
        if (keys.length === 0) {
            throw new Error('At least one Key object is required.');
        }
        const makeRequest = (keys) => {
            const reqOpts = {
                keys,
            };
            if (options.consistency) {
                const code = CONSISTENCY_PROTO_CODE[options.consistency.toLowerCase()];
                reqOpts.readOptions = {
                    readConsistency: code,
                };
            }
            this.request_({
                client: 'DatastoreClient',
                method: 'lookup',
                reqOpts,
                gaxOpts: options.gaxOptions,
            }, (err, resp) => {
                if (err) {
                    stream.destroy(err);
                    return;
                }
                const entities = entity_1.entity.formatArray(resp.found, options.resultFormat);
                const nextKeys = (resp.deferred || [])
                    .map(entity_1.entity.keyFromKeyProto)
                    .map(entity_1.entity.keyToKeyProto);
                split_array_stream_1.split(entities, stream).then(streamEnded => {
                    if (streamEnded) {
                        return;
                    }
                    if (nextKeys.length > 0) {
                        makeRequest(nextKeys);
                        return;
                    }
                    stream.push(null);
                });
            });
        };
        const stream = streamEvents(through.obj());
        stream.once('reading', () => {
            makeRequest(keys);
        });
        return stream;
    }
    delete(keys, gaxOptionsOrCallback, cb) {
        const gaxOptions = typeof gaxOptionsOrCallback === 'object' ? gaxOptionsOrCallback : {};
        const callback = typeof gaxOptionsOrCallback === 'function' ? gaxOptionsOrCallback : cb;
        const reqOpts = {
            mutations: arrify(keys).map(key => {
                return {
                    delete: entity_1.entity.keyToKeyProto(key),
                };
            }),
        };
        if (this.id) {
            this.requests_.push(reqOpts);
            return;
        }
        this.request_({
            client: 'DatastoreClient',
            method: 'commit',
            reqOpts,
            gaxOpts: gaxOptions,
        }, callback);
    }
    get(keys, optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' && optionsOrCallback ?
            optionsOrCallback :
            {};
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        this.createReadStream(keys, options)
            .on('error', callback)
            .pipe(concat((results) => {
            const isSingleLookup = !Array.isArray(keys);
            callback(null, isSingleLookup ? results[0] : results);
        }));
    }
    insert(entities, callback) {
        entities =
            arrify(entities).map(DatastoreRequest.prepareEntityObject_).map(x => {
                x.method = 'insert';
                return x;
            });
        this.save(entities, callback);
    }
    runQuery(query, optionsOrCallback, cb) {
        const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
        let info;
        this.runQueryStream(query, options)
            .on('error', callback)
            .on('info', info_ => {
            info = info_;
        })
            .pipe(concat((results) => {
            callback(null, results, info);
        }));
    }
    /**
     * Get a list of entities as a readable object stream.
     *
     * See {@link Datastore#runQuery} for a list of all available options.
     *
     * @param {Query} query Query object.
     * @param {object} [options] Optional configuration.
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     *
     * @example
     * datastore.runQueryStream(query)
     *   .on('error', console.error)
     *   .on('data', (entity) => {
     *     // Access the Key object for this entity.
     *     const key = entity[datastore.KEY];
     *   })
     *   .on('info', (info) => {})
     *   .on('end', () => {
     *     // All entities retrieved.
     *   });
     *
     * //-
     * // If you anticipate many results, you can end a stream early to prevent
     * // unnecessary processing and API requests.
     * //-
     * datastore.runQueryStream(query)
     *   .on('data', (entity) => {
     *     this.end();
     *   });
     */
    runQueryStream(query, options = {}) {
        query = extend(true, new query_1.Query(), query);
        const makeRequest = (query) => {
            const reqOpts = {
                query: entity_1.entity.queryToQueryProto(query),
            };
            if (options.consistency) {
                const code = CONSISTENCY_PROTO_CODE[options.consistency.toLowerCase()];
                reqOpts.readOptions = {
                    readConsistency: code,
                };
            }
            if (query.namespace) {
                reqOpts.partitionId = {
                    namespaceId: query.namespace,
                };
            }
            this.request_({
                client: 'DatastoreClient',
                method: 'runQuery',
                reqOpts,
                gaxOpts: options.gaxOptions,
            }, onResultSet);
        };
        function onResultSet(err, resp) {
            if (err) {
                stream.destroy(err);
                return;
            }
            const info = {
                moreResults: resp.batch.moreResults,
            };
            if (resp.batch.endCursor) {
                info.endCursor = resp.batch.endCursor.toString('base64');
            }
            let entities = [];
            if (resp.batch.entityResults) {
                entities = entity_1.entity.formatArray(resp.batch.entityResults, options.resultFormat);
            }
            // Emit each result right away, then get the rest if necessary.
            split_array_stream_1.split(entities, stream).then(streamEnded => {
                if (streamEnded) {
                    return;
                }
                if (resp.batch.moreResults !== 'NOT_FINISHED') {
                    stream.emit('info', info);
                    stream.push(null);
                    return;
                }
                // The query is "NOT_FINISHED". Get the rest of the results.
                const offset = query.offsetVal === -1 ? 0 : query.offsetVal;
                query.start(info.endCursor).offset(offset - resp.batch.skippedResults);
                const limit = query.limitVal;
                if (limit && limit > -1) {
                    query.limit(limit - resp.batch.entityResults.length);
                }
                makeRequest(query);
            });
        }
        const stream = streamEvents(through.obj());
        stream.once('reading', () => {
            makeRequest(query);
        });
        return stream;
    }
    save(entities, gaxOptionsOrCallback, cb) {
        entities = arrify(entities);
        const gaxOptions = typeof gaxOptionsOrCallback === 'object' ? gaxOptionsOrCallback : {};
        const callback = typeof gaxOptionsOrCallback === 'function' ? gaxOptionsOrCallback : cb;
        const insertIndexes = {};
        const mutations = [];
        const methods = {
            insert: true,
            update: true,
            upsert: true,
        };
        // Iterate over the entity objects, build a proto from all keys and values,
        // then place in the correct mutation array (insert, update, etc).
        entities.map(DatastoreRequest.prepareEntityObject_)
            .forEach((entityObject, index) => {
            const mutation = {};
            let entityProto = {};
            let method = 'upsert';
            if (entityObject.method) {
                if (methods[entityObject.method]) {
                    method = entityObject.method;
                }
                else {
                    throw new Error('Method ' + entityObject.method + ' not recognized.');
                }
            }
            if (!entity_1.entity.isKeyComplete(entityObject.key)) {
                insertIndexes[index] = true;
            }
            // @TODO remove in @google-cloud/datastore@2.0.0
            // This was replaced with a more efficient mechanism in the top-level
            // `excludeFromIndexes` option.
            if (Array.isArray(entityObject.data)) {
                entityProto.properties = entityObject.data.reduce((acc, data) => {
                    const value = entity_1.entity.encodeValue(data.value);
                    if (typeof data.excludeFromIndexes === 'boolean') {
                        const excluded = data.excludeFromIndexes;
                        let values = value.arrayValue && value.arrayValue.values;
                        if (values) {
                            values = values.map((x) => {
                                x.excludeFromIndexes = excluded;
                                return x;
                            });
                        }
                        else {
                            value.excludeFromIndexes = data.excludeFromIndexes;
                        }
                    }
                    acc[data.name] = value;
                    return acc;
                }, {});
            }
            else {
                entityProto = entity_1.entity.entityToEntityProto(entityObject);
            }
            entityProto.key = entity_1.entity.keyToKeyProto(entityObject.key);
            mutation[method] = entityProto;
            mutations.push(mutation);
        });
        const reqOpts = {
            mutations,
        };
        function onCommit(err, resp) {
            if (err || !resp) {
                callback(err, resp);
                return;
            }
            arrify(resp.mutationResults).forEach((result, index) => {
                if (!result.key) {
                    return;
                }
                if (insertIndexes[index]) {
                    const id = entity_1.entity.keyFromKeyProto(result.key).id;
                    entities[index].key.id = id;
                }
            });
            callback(null, resp);
        }
        if (this.id) {
            this.requests_.push(reqOpts);
            this.requestCallbacks_.push(onCommit);
            return;
        }
        this.request_({
            client: 'DatastoreClient',
            method: 'commit',
            reqOpts,
            gaxOpts: gaxOptions || {},
        }, onCommit);
    }
    update(entities, callback) {
        entities =
            arrify(entities).map(DatastoreRequest.prepareEntityObject_).map(x => {
                x.method = 'update';
                return x;
            });
        this.save(entities, callback);
    }
    upsert(entities, callback) {
        entities =
            arrify(entities).map(DatastoreRequest.prepareEntityObject_).map(x => {
                x.method = 'upsert';
                return x;
            });
        this.save(entities, callback);
    }
    request_(config, callback) {
        const datastore = this.datastore;
        const isTransaction = this.id ? true : false;
        const method = config.method;
        let reqOpts = extend(true, {}, config.reqOpts);
        reqOpts.projectId = datastore.projectId;
        // Set properties to indicate if we're in a transaction or not.
        if (method === 'commit') {
            if (isTransaction) {
                reqOpts.mode = 'TRANSACTIONAL';
                reqOpts.transaction = this.id;
            }
            else {
                reqOpts.mode = 'NON_TRANSACTIONAL';
            }
        }
        if (method === 'rollback') {
            reqOpts.transaction = this.id;
        }
        if (isTransaction && (method === 'lookup' || method === 'runQuery')) {
            if (reqOpts.readOptions && reqOpts.readOptions.readConsistency) {
                throw new Error('Read consistency cannot be specified in a transaction.');
            }
            reqOpts.readOptions = {
                transaction: this.id,
            };
        }
        datastore.auth.getProjectId((err, projectId) => {
            if (err) {
                callback(err);
                return;
            }
            const clientName = config.client;
            if (!datastore.clients_.has(clientName)) {
                datastore.clients_.set(clientName, new gapic.v1[clientName](datastore.options));
            }
            const gaxClient = datastore.clients_.get(clientName);
            reqOpts = projectify_1.replaceProjectIdToken(reqOpts, projectId);
            const gaxOpts = extend(true, {}, config.gaxOpts, {
                headers: {
                    'google-cloud-resource-prefix': `projects/${projectId}`,
                },
            });
            gaxClient[method](reqOpts, gaxOpts, callback);
        });
    }
}
exports.DatastoreRequest = DatastoreRequest;
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisify_1.promisifyAll(DatastoreRequest);
//# sourceMappingURL=request.js.map