/**
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
import { Query, QueryProto } from './query';
export declare namespace entity {
    interface InvalidKeyErrorOptions {
        code: string;
    }
    class InvalidKeyError extends Error {
        constructor(opts: InvalidKeyErrorOptions);
    }
    /**
     * A symbol to access the Key object from an entity object.
     *
     * @type {symbol}
     * @private
     */
    const KEY_SYMBOL: unique symbol;
    /**
     * Build a Datastore Double object. For long doubles, a string can be
     * provided.
     *
     * @class
     * @param {number} value The double value.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const aDouble = datastore.double(7.3);
     */
    class Double {
        value: number;
        constructor(value: number);
    }
    /**
     * Check if something is a Datastore Double object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsDouble(value?: {}): boolean;
    /**
     * Build a Datastore Int object. For long integers, a string can be provided.
     *
     * @class
     * @param {number|string} value The integer value.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const anInt = datastore.int(7);
     */
    class Int {
        value: string;
        constructor(value: number | string);
    }
    /**
     * Check if something is a Datastore Int object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsInt(value?: {}): boolean;
    interface Coordinates {
        latitude: number;
        longitude: number;
    }
    /**
     * Build a Datastore Geo Point object.
     *
     * @class
     * @param {object} coordinates Coordinate value.
     * @param {number} coordinates.latitude Latitudinal value.
     * @param {number} coordinates.longitude Longitudinal value.
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const coordinates = {
     *   latitude: 40.6894,
     *   longitude: -74.0447
     * };
     *
     * const geoPoint = datastore.geoPoint(coordinates);
     */
    class GeoPoint {
        value: Coordinates;
        constructor(coordinates: Coordinates);
    }
    /**
     * Check if something is a Datastore Geo Point object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsGeoPoint(value?: {}): boolean;
    interface KeyOptions {
        namespace?: string;
        path: Array<string | number>;
    }
    /**
     * Build a Datastore Key object.
     *
     * @class
     * @param {object} options Configuration object.
     * @param {array} options.path Key path.
     * @param {string} [options.namespace] Optional namespace.
     *
     * @example
     * <caption>Create an incomplete key with a kind value of `Company`.</caption>
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key('Company');
     *
     * @example
     * <caption>Create a complete key with a kind value of `Company` and id
     * `123`.</caption> const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key(['Company', 123]);
     *
     * @example
     * <caption>If the ID integer is outside the bounds of a JavaScript Number
     * object, create an Int.</caption> const {Datastore} =
     * require('@google-cloud/datastore'); const datastore = new Datastore();
     * const key = datastore.key([
     *   'Company',
     *   datastore.int('100000000000001234')
     * ]);
     *
     * @example
     * const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * // Create a complete key with a kind value of `Company` and name `Google`.
     * // Note: `id` is used for numeric identifiers and `name` is used otherwise.
     * const key = datastore.key(['Company', 'Google']);
     *
     * @example
     * <caption>Create a complete key from a provided namespace and
     * path.</caption> const {Datastore} = require('@google-cloud/datastore');
     * const datastore = new Datastore();
     * const key = datastore.key({
     *   namespace: 'My-NS',
     *   path: ['Company', 123]
     * });
     */
    class Key {
        namespace?: string;
        id?: string;
        name?: string;
        kind: string;
        parent?: Key;
        path: Array<string | number>;
        constructor(options: KeyOptions);
    }
    /**
     * Check if something is a Datastore Key object.
     *
     * @private
     * @param {*} value
     * @returns {boolean}
     */
    function isDsKey(value?: {}): boolean;
    /**
     * Convert a protobuf Value message to its native value.
     *
     * @private
     * @param {object} valueProto The protobuf Value message to convert.
     * @returns {*}
     *
     * @example
     * decodeValueProto({
     *   booleanValue: false
     * });
     * // false
     *
     * decodeValueProto({
     *   stringValue: 'Hi'
     * });
     * // 'Hi'
     *
     * decodeValueProto({
     *   blobValue: Buffer.from('68656c6c6f')
     * });
     * // <Buffer 68 65 6c 6c 6f>
     */
    function decodeValueProto(valueProto: ValueProto): any;
    /**
     * Convert any native value to a protobuf Value message object.
     *
     * @private
     * @param {*} value Native value.
     * @returns {object}
     *
     * @example
     * encodeValue('Hi');
     * // {
     * //   stringValue: 'Hi'
     * // }
     */
    function encodeValue(value?: any): ValueProto;
    /**
     * Convert any entity protocol to a plain object.
     *
     * @todo Use registered metadata if provided.
     *
     * @private
     * @param {object} entityProto The protocol entity object to convert.
     * @returns {object}
     *
     * @example
     * entityFromEntityProto({
     *   properties: {
     *     map: {
     *       name: {
     *         value: {
     *           valueType: 'stringValue',
     *           stringValue: 'Stephen'
     *         }
     *       }
     *     }
     *   }
     * });
     * // {
     * //   name: 'Stephen'
     * // }
     */
    function entityFromEntityProto(entityProto: EntityProto): any;
    /**
     * Convert an entity object to an entity protocol object.
     *
     * @private
     * @param {object} entityObject The entity object to convert.
     * @returns {object}
     *
     * @example
     * entityToEntityProto({
     *   excludeFromIndexes: [
     *     'name'
     *   ],
     *   data: {
     *     name: 'Burcu',
     *     legit: true
     *   }
     * });
     * // {
     * //   key: null,
     * //   properties: {
     * //     name: {
     * //       stringValue: 'Burcu'
     * //       excludeFromIndexes: true
     * //     },
     * //     legit: {
     * //       booleanValue: true
     * //     }
     * //   }
     * // }
     */
    function entityToEntityProto(entityObject: Entity): EntityProto;
    /**
     * Convert an API response array to a qualified Key and data object.
     *
     * @private
     * @param {object[]} results The response array.
     * @param {object} results.entity An entity object.
     * @param {object} results.entity.key The entity's key.
     * @returns {object[]}
     *
     * @example
     * request_('runQuery', {}, (err, response) => {
     *   const entityObjects = formatArray(response.batch.entityResults);
     *   // {
     *   //   key: {},
     *   //   data: {
     *   //     fieldName: 'value'
     *   //   }
     *   // }
     *   //
     * });
     */
    function formatArray(results: ResponseResult[], resultFormat?: boolean): any[];
    /**
     * Check if a key is complete.
     *
     * @private
     * @param {Key} key The Key object.
     * @returns {boolean}
     *
     * @example
     * isKeyComplete(new Key(['Company', 'Google'])); // true
     * isKeyComplete(new Key('Company')); // false
     */
    function isKeyComplete(key: Key): boolean;
    /**
     * Convert a key protocol object to a Key object.
     *
     * @private
     * @param {object} keyProto The key protocol object to convert.
     * @returns {Key}
     *
     * @example
     * const key = keyFromKeyProto({
     *   partitionId: {
     *     projectId: 'project-id',
     *     namespaceId: ''
     *   },
     *   path: [
     *     {
     *       kind: 'Kind',
     *       id: '4790047639339008'
     *     }
     *   ]
     * });
     */
    function keyFromKeyProto(keyProto: KeyProto): Key;
    /**
     * Convert a Key object to a key protocol object.
     *
     * @private
     * @param {Key} key The Key object to convert.
     * @returns {object}
     *
     * @example
     * const keyProto = keyToKeyProto(new Key(['Company', 1]));
     * // {
     * //   path: [
     * //     {
     * //       kind: 'Company',
     * //       id: 1
     * //     }
     * //   ]
     * // }
     */
    function keyToKeyProto(key: Key): KeyProto;
    /**
     * Convert a query object to a query protocol object.
     *
     * @private
     * @param {object} q The query object to convert.
     * @returns {object}
     *
     * @example
     * queryToQueryProto({
     *   namespace: '',
     *   kinds: [
     *     'Kind'
     *   ],
     *   filters: [],
     *   orders: [],
     *   groupByVal: [],
     *   selectVal: [],
     *   startVal: null,
     *   endVal: null,
     *   limitVal: -1,
     *   offsetVal: -1
     * });
     * // {
     * //   projection: [],
     * //   kinds: [
     * //     {
     * //       name: 'Kind'
     * //     }
     * //   ],
     * //   order: [],
     * //   groupBy: []
     * // }
     */
    function queryToQueryProto(query: Query): QueryProto;
}
export interface ValueProto {
    [index: string]: any;
    valueType?: string;
    values?: ValueProto[];
    value?: any;
}
export interface EntityProto {
    key: KeyProto | null;
    properties: any;
    excludeFromIndexes?: boolean;
}
export declare type Entity = any;
export declare type EntityResult = {
    entity: EntityProto;
    version: number;
    cursor: string;
};
export interface KeyProto {
    path: Array<{
        [index: string]: any;
        id: string;
        name: string;
        kind?: string;
        idType?: string;
    }>;
    partitionId?: {
        namespaceId: {};
    };
}
export interface ResponseResult extends EntityResult {
}
