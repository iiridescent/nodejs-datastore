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
/// <reference types="node" />
import { google } from '../proto/datastore';
import { CallOptions } from 'google-gax';
import { Transform } from 'stream';
import { entity, Entity, KeyProto, ValueProto } from './entity';
import { Query, RunQueryOptions, RunQueryResponse, RunQueryCallback } from './query';
import { Datastore } from '.';
/**
 * Handle logic for Datastore API operations. Handles request logic for
 * Datastore.
 *
 * Creates requests to the Datastore endpoint. Designed to be inherited by
 * the {@link Datastore} and {@link Transaction} classes.
 *
 * @class
 */
declare class DatastoreRequest {
    id: string | number | undefined;
    requests_: Entity | {
        mutations: Array<{}>;
    };
    requestCallbacks_: Array<(err: Error | null, resp: Entity | null) => void> | Entity;
    datastore: Datastore;
    [key: string]: Entity;
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
    static prepareEntityObject_(obj: Entity): PrepareEntityObjectResponse;
    allocateIds(key: entity.Key, options: AllocateIdsOptions | number): Promise<AllocateIdsResponse>;
    allocateIds(key: entity.Key, options: AllocateIdsOptions | number, callback: AllocateIdsCallback): void;
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
    createReadStream(keys: Entities, options?: CreateReadStreamOptions): Transform;
    delete(): Promise<CommitResponse>;
    delete(keys: Entities): void;
    delete(keys: Entities, callback: CommitCallback): void;
    delete(keys: Entities, gaxOptions: CallOptions, callback: CommitCallback): void;
    get(keys: Entities, options?: CreateReadStreamOptions): Promise<Entity | Transform>;
    get(keys: Entities, callback: GetCallback): void;
    get(keys: Entities, options: CreateReadStreamOptions, callback: GetCallback): void;
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `insert`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    insert(entities: Entities, callback?: CallOptions): void | Promise<CommitResponse>;
    runQuery(query: Query, options?: RunQueryOptions): Promise<RunQueryResponse>;
    runQuery(query: Query, options: RunQueryOptions, callback: RunQueryCallback): void;
    runQuery(query: Query, callback: RunQueryCallback): void;
    /**
     * Datastore allows you to query entities by kind, filter them by property
     * filters, and sort them by a property name. Projection and pagination are
     * also supported.
     *
     * The query is run, and the results are returned as the second argument to
     * your callback. A third argument may also exist, which is a query object
     * that uses the end cursor from the previous query as the starting cursor for
     * the next query. You can pass that object back to this method to see if more
     * results exist.
     *
     * @param {Query} query Query object.
     * @param {object} [options] Optional configuration.
     * @param {string} [options.consistency] Specify either `strong` or `eventual`.
     *     If not specified, default values are chosen by Datastore for the
     *     operation. Learn more about strong and eventual consistency
     *     [here](https://cloud.google.com/datastore/docs/articles/balancing-strong-and-eventual-consistency-with-google-cloud-datastore).
     * @param {object} [options.gaxOptions] Request configuration options, outlined
     *     here: https://googleapis.github.io/gax-nodejs/global.html#CallOptions.
     * @param {function} [callback] The callback function. If omitted, a readable
     *     stream instance is returned.
     * @param {?error} callback.err An error returned while making this request
     * @param {object[]} callback.entities A list of entities.
     * @param {object} callback.info An object useful for pagination.
     * @param {?string} callback.info.endCursor Use this in a follow-up query to
     *     begin from where these results ended.
     * @param {string} callback.info.moreResults Datastore responds with one of:
     *
     *     - {@link Datastore#MORE_RESULTS_AFTER_LIMIT}: There *may* be more
     *       results after the specified limit.
     *     - {@link Datastore#MORE_RESULTS_AFTER_CURSOR}: There *may* be more
     *       results after the specified end cursor.
     *     - {@link Datastore#NO_MORE_RESULTS}: There are no more results.
     *
     * @example
     * //-
     * // Where you see `transaction`, assume this is the context that's relevant
     * to
     * // your use, whether that be a Datastore or a Transaction object.
     * //-
     * const query = datastore.createQuery('Lion');
     *
     * datastore.runQuery(query, (err, entities, info) => {
     *   // entities = An array of records.
     *
     *   // Access the Key object for an entity.
     *   const firstEntityKey = entities[0][datastore.KEY];
     * });
     *
     * //-
     * // Or, if you're using a transaction object.
     * //-
     * const transaction = datastore.transaction();
     *
     * transaction.run((err) => {
     *   if (err) {
     *     // Error handling omitted.
     *   }
     *
     *   transaction.runQuery(query, (err, entities) => {
     *     if (err) {
     *       // Error handling omitted.
     *     }
     *
     *     transaction.commit((err) => {
     *       if (!err) {
     *         // Transaction committed successfully.
     *       }
     *     });
     *   });
     * });
     *
     * //-
     * // A keys-only query returns just the keys of the result entities instead
     * of
     * // the entities themselves, at lower latency and cost.
     * //-
     * const keysOnlyQuery = datastore.createQuery('Lion').select('__key__');
     *
     * datastore.runQuery(keysOnlyQuery, (err, entities) => {
     *   const keys = entities.map((entity) => {
     *     return entity[datastore.KEY];
     *   });
     * });
     *
     * //-
     * // Returns a Promise if callback is omitted.
     * //-
     * datastore.runQuery(query).then((data) => {
     *   const entities = data[0];
     * });
     */
    runQuery(query: Query, options?: RunQueryOptions): Promise<RunQueryResponse>;
    runQuery(query: Query, options: RunQueryOptions, callback: RunQueryCallback): void;
    runQuery(query: Query, callback: RunQueryCallback): void;
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
    runQueryStream(query: Query, options?: RunQueryStreamOptions): Transform;
    save(entities: Entities): Promise<CommitResponse>;
    save(entities: Entities, gaxOptions?: CallOptions): Promise<CommitResponse>;
    save(entities: Entities, gaxOptions: CallOptions, callback: SaveCallback): void;
    save(entities: Entities, callback: SaveCallback): void;
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `update`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    update(entities: Entities, callback?: CallOptions): void | Promise<CommitResponse>;
    /**
     * Maps to {@link Datastore#save}, forcing the method to be `upsert`.
     *
     * @param {object|object[]} entities Datastore key object(s).
     * @param {Key} entities.key Datastore key object.
     * @param {string[]} [entities.excludeFromIndexes] Exclude properties from
     *     indexing using a simple JSON path notation. See the examples in
     *     {@link Datastore#save} to see how to target properties at different
     *     levels of nesting within your entity.
     * @param {object} entities.data Data to save with the provided key.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while making this request
     * @param {object} callback.apiResponse The full API response.
     */
    upsert(entities: Entities, callback?: CallOptions): void | Promise<CommitResponse>;
    /**
     * Make a request to the API endpoint. Properties to indicate a transactional
     * or non-transactional operation are added automatically.
     *
     * @param {object} config Configuration object.
     * @param {object} config.gaxOpts GAX options.
     * @param {function} config.method The gax method to call.
     * @param {object} config.reqOpts Request options.
     * @param {function} callback The callback function.
     *
     * @private
     */
    request_(config: RequestConfig, callback: RequestCallback): void;
}
export interface BooleanObject {
    [key: string]: boolean;
}
export interface ConsistencyProtoCode {
    [key: string]: number;
}
export declare type CommitResponse = [google.datastore.v1.ICommitResponse];
export declare type Entities = Entity | Entity[];
export interface EntityProtoObject {
    method?: string;
    properties?: {
        [key: string]: ValueProto;
    };
    key?: Keys;
}
export interface EntityProtoReduceAccumulator {
    [key: string]: ValueProto;
}
export interface EntityProtoReduceData {
    value: ValueProto;
    excludeFromIndexes: ValueProto;
    name: string | number;
}
export interface AllocateIdsRequestResponse {
    keys: KeyProto[];
    mutationResults?: Entities;
}
export declare type AllocateIdsResponse = [google.datastore.v1.AllocateIdsResponse];
export interface AllocateIdsCallback {
    (a: Error | null, b: entity.Key[] | null, c: AllocateIdsRequestResponse): void;
}
export interface AllocateIdsOptions {
    allocations?: number;
    gaxOptions?: CallOptions;
}
export interface CreateReadStreamOptions {
    consistency?: string;
    resultFormat?: boolean;
    gaxOptions?: CallOptions;
}
export interface CommitCallback {
    (err?: Error | null, resp?: google.datastore.v1.CommitResponse): void;
}
export interface GetCallback {
    (...args: Entity[]): void;
}
export declare type GetProjectIdErr = Error | null | undefined;
export declare type Keys = Entity | Entity[];
export interface Mutation extends google.datastore.v1.IMutation {
    [key: string]: Entity;
}
export interface PrepareEntityObject {
    [key: string]: google.datastore.v1.Key | undefined;
}
export interface PrepareEntityObjectResponse {
    key?: google.datastore.v1.Key;
    data?: google.datastore.v1.Entity;
    method?: string;
}
export declare type ProjectId = string | null | undefined;
export interface RequestCallback {
    (a?: Error | null, b?: AllocateIdsRequestResponse & google.datastore.v1.ILookupResponse & Entities): void;
}
export interface RequestConfig {
    client: string;
    gaxOpts?: number | CallOptions | KeyProto;
    method: string;
    prepared?: boolean;
    reqOpts?: Entity | RequestOptions;
    gaxOptions?: never;
}
export interface RequestOptions {
    mutations?: [] | Array<{
        delete: KeyProto;
    }> | Array<{}>;
    keys?: Entity;
    readOptions?: {
        readConsistency?: number;
        transaction?: string | number;
    };
    transactionOptions?: {
        readOnly?: {};
        readWrite?: {
            previousTransaction?: string;
        };
    };
    transaction?: string | number;
    mode?: string;
    projectId?: string;
}
export interface RunQueryStreamOptions {
    gaxOptions?: CallOptions;
    consistency?: 'strong' | 'eventual';
    resultFormat?: boolean;
}
export interface SaveCallback {
    (a?: Error | null, b?: Entity): void;
}
/**
 * Reference to the {@link DatastoreRequest} class.
 * @name module:@google-cloud/datastore.DatastoreRequest
 * @see DatastoreRequest
 */
export { DatastoreRequest };
