/**
* Copyright 2019 University Of Helsinki (The National Library Of Finland)
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import {AlephSequential, MARCXML} from '@natlibfi/marc-record-serializers';

export function createSubfieldValueFilter({tag, code, value}) {
	return record => record.get(tag.some(f => f.subfields.some(sf => {
		return code.test(sf.code) && value.test(sf.value);
	})));
}

export async function getResults({connection, query, cb, args = {}}) {
	const {resultSet} = await connection.execute(query, args, {resultSet: true});
	return pump();

	async function pump(results = []) {
		const row = await resultSet.getRow();

		if (row) {
			const formatted = cb(row);

			if (formatted) {
				return pump(results.concat(formatted));
			}
		}

		await resultSet.close();
		return {payload: results};
	}
}

export function parseRecord(data) {
	const buffer = Buffer.from(data);

	return iterate();

	function iterate(offset = 0, lines = []) {
		if (offset + 4 > buffer.length) {
			const str = lines.join('\n');
			return transformRecord(str);
		}

		const length = Number(buffer.toString('utf8', offset, offset + 4));
		const line = buffer.toString('utf8', offset + 4, offset + 4 + length);

		return iterate(offset + 4 + length, lines.concat(format(line)));

		function format(l) {
			const start = l.substr(0, 5);
			const end = l.substr(5);
			return `000000000 ${start} ${end}`;
		}

		function transformRecord(str) {
			return AlephSequential.from(str);
		}
	}
}

export function formatRecord(record) {
	return MARCXML.to(record);
}
