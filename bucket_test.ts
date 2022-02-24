interface Item {
	/** 種類 */
	type: string;
	/** 數量，需為正整數 */
	amount: number;
}

interface Bucket {
	/** 名稱 */
	name: string;
	/** 需求數 */
	amount: number;
}

type Answer = Array<{
	/** 籃子名稱 */
	name: string;
	/** 放入此欄的東西 */
	items: Array<Item>
}>;

type CombinationResult = Array<{
	items: Array<Item>,
	legacyItems: Array<Item>
}>;

// 紀錄 單一 bucket 與各種 Items 的組合
const combinationDic: { [k : string]: CombinationResult} = {}

/**
 * 求解多籃組合，每個籃子要取 bucket.amount 個或完全不用
 * @description
 * 1. 一個 answer 中不會有籃子重複
 * 2. 一個 answer 中會有一個特殊籃子，其 name 為 `null` 代表沒有分配到任何籃子
 * 3. 空的籃子不要出現在 answer 中
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function bucketCombinationResolver (items: Array<Item>, buckets: Array<Bucket>): Array<Answer> {
	const allBucketCombinations = getAllBucketCombinations(items, buckets);
	
	return deleteDuplicatedAnswer(allBucketCombinations);
}

function getAllBucketCombinations (items: Array<Item>, buckets: Array<Bucket>): Array<Answer> {
	let answer: Array<Answer> = [];
	const cloneItems = deepClone(items);
	
	if (buckets.length === 1) {
		if (getSumOfItems(items) === 0) {
			return [];
		}
		
		if (getSumOfItems(items) < buckets[0].amount) {
			return [[{name: 'null', items}]];
		}

		const bucketPossibilities = getBucketWithItems(buckets[0], cloneItems);

		bucketPossibilities.forEach(bucketPossibility => {
			let _answer: Answer = [];
			if (bucketPossibility.answer.length === 0) {
				_answer =  [{ name: 'null', items: bucketPossibility.legacyItems }]
			} else {
				_answer = bucketPossibility.answer.concat([{ name: 'null', items: bucketPossibility.legacyItems }])
			}
			answer.push(_answer);
		})

		return answer;
	}  
	
	const legacyBucket = deepClone(buckets.slice(1));

	if (getSumOfItems(cloneItems) < buckets[0].amount) {
		const legacyBucketAnswer = getAllBucketCombinations(cloneItems, legacyBucket);
		answer = answer.concat(legacyBucketAnswer);
	} else {
		const bucketPossibilities = getBucketWithItems(buckets[0], cloneItems);
		
		for (let i = 0; i < bucketPossibilities.length; i++) {
			const legacyBucketsCombination = getAllBucketCombinations(bucketPossibilities[i].legacyItems, legacyBucket);

			for (let k = 0; k < legacyBucketsCombination.length; k++) {
				let _answer: Answer = [];
				_answer.push(...bucketPossibilities[i].answer);
				_answer.push(...legacyBucketsCombination[k]);
				answer.push(_answer);
			}
		}
	}
	return answer;
}

function getSumOfItems (items: Array<Item>): number {
	return items.reduce((result, item) => result + item.amount, 0);
}

function deepClone <T> (obj: T): T  {
	return JSON.parse(JSON.stringify(obj));
}

function getBucketWithItems(bucket: Bucket, items: Array<Item>): Array<{
	answer: Answer,
	legacyItems: Array<Item>
}> {
	const combinations = deleteDuplicatedCombinations(getCombinations(bucket.amount, items));
	
	// 可能不選
	const result = combinations.map(combination => ({
		answer: [{ name: bucket.name, items: combination.items }],
		legacyItems: combination.legacyItems
	}));
	return [{answer:[] as Answer, legacyItems: items}].concat(result);
}

function deleteDuplicatedCombinations (combinations: CombinationResult): CombinationResult {
	const dictionary: Record<string, boolean> = {};
	
	const uniqueCombinations = combinations.reduce((result, combination) => {
		const dictionaryKey = convertItemsToString(combination.items);

		if (dictionary[dictionaryKey]) return result;

		result.push(combination);
		dictionary[dictionaryKey] = true;
		return result;
	}, [] as CombinationResult);

	return uniqueCombinations;
}

function convertToCombinationString(amount: number, items: Array<Item>): string {
	let result = amount.toString();

	items.forEach(item => {
		result = result + item.type + item.amount;
	})

	return result;
}

function getCombinations(bucketAmount: number, items: Array<Item>): CombinationResult {
	const result: CombinationResult = [];
	
	const combinationDicKey = convertToCombinationString(bucketAmount, items);
	if (combinationDic[combinationDicKey]) return combinationDic[combinationDicKey];

	if (bucketAmount === 1) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].amount === 0) continue;

			let cloneItems = deepClone(items);
			cloneItems[i].amount = cloneItems[i].amount - 1;
			result.push({
				items: [{ type: cloneItems[i].type, amount: 1}],
				legacyItems: cloneItems
			})
		}
		return result;
	}

	for (let i = 0; i < items.length; i++) {
		if (items[i].amount === 0) continue;
			
		let cloneItems = deepClone(items);

		cloneItems[i].amount = cloneItems[i].amount - 1;
		const combinationDicKey = convertToCombinationString(bucketAmount - 1, cloneItems);
		
		if (!combinationDic[combinationDicKey]) {
			const combinationResult = getCombinations(bucketAmount - 1, cloneItems);

			combinationDic[combinationDicKey] = combinationResult
		}
		
		combinationDic[combinationDicKey].forEach(oneOfCombination => {
			const cloneOneOfCombination = deepClone(oneOfCombination);
			const itemIndex = oneOfCombination.items.findIndex(item => item.type === cloneItems[i].type);

			if (itemIndex > -1) {
				cloneOneOfCombination.items[itemIndex].amount = cloneOneOfCombination.items[itemIndex].amount + 1;
				result.push(cloneOneOfCombination);
			} else {
				result.push({
					items: cloneOneOfCombination.items.concat({ amount: 1, type: cloneItems[i].type}),
					legacyItems: cloneOneOfCombination.legacyItems
				})
			}
		})
	}
	return result;
}

function deleteDuplicatedAnswer(answer: Array<Answer>): Array<Answer> {
	const dic: Record<string, boolean>  = {};
	const newAnswer: Array<Answer> = [];

	answer.forEach(oneOfAnswer => {
		const dicKey = convertAnswerToString(oneOfAnswer);
		if (!dic[dicKey]) {
			dic[dicKey] = true;
			newAnswer.push(oneOfAnswer);
		}
	})
	
	return newAnswer;
}

/** get dictionary key */
function convertAnswerToString(answer: Answer): string {
	// sort by bucket name
	const sortedAnswer = answer.sort(
		(a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0
	)

	const dictionaryKey = sortedAnswer.reduce((result, answer) => {
		// sort by item type
		const sortedItems = answer.items.sort(
			(a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : 0
		)

		const convertedStringOfItems = sortedItems.reduce((stringOfItems, item) => stringOfItems + item.type + item.amount, '');

		return result + answer.name + convertedStringOfItems;
	}, '')

	return dictionaryKey;
}

function convertItemsToString(items: Item[]): string {
	// sort by item type
	const sortedItems = items.sort(
		(a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : 0
	)

	const dictionaryKey = sortedItems.reduce((result, item) => result + item.type + item.amount, '');

	return dictionaryKey;
}

const answers2 = bucketCombinationResolver(
	[
		{ type: 'Apple', amount: 1 },
		{ type: 'Banana', amount: 1 },
		{ type: 'Cat', amount: 1 },
	],
	[
		{ name: 'Bucket1', amount: 2 },
		{ name: 'Bucket2', amount: 2 },
	]
);

/** 2 * C3取1 + 1 */
if (answers2.length !== 7) throw new Error(`結果數量錯誤`);
answers2.forEach(answer => {
	if (answer.length > 3) throw new Error(`結果至多 3 籃`);
	// 我這邊改了一下變數名稱 一開始沒看懂意思
	const sumAll = answer.reduce((perItemsSumOfAllBuckets, bucket) => {
		if (bucket.items.length > 3) throw new Error(`每個籃子至多 3 種東西`);
		const bucketSum = bucket.items.reduce((prev, curr) => {
			return prev + curr.amount;
		}, 0);
		if (bucketSum === 0) throw new Error(`加總為零的籃子不應該出現在解答中`);
		if (bucket.name === 'Bucket1' && bucketSum !== 2) throw new Error(`Bucket1 加總應為 2`);
		if (bucket.name === 'Bucket2' && bucketSum !== 2) throw new Error(`Bucket2 加總應為 2`);
		return perItemsSumOfAllBuckets + bucketSum;
	}, 0);
	if (sumAll !== 3) throw new Error(`所有籃子數量加總錯誤`);
});

const answers = bucketCombinationResolver(
	[
		{ type: 'Apple', amount: 4 },
		{ type: 'Banana', amount: 2 },
		{ type: 'Cat', amount: 5 },
		{ type: 'Dog', amount: 1 },
		{ type: 'Fogo', amount: 6 },
	],
	[
		{ name: 'Bucket1', amount: 3 },
		{ name: 'Bucket2', amount: 5 },
		{ name: 'Bucket3', amount: 2 },
	]
);
if (answers.length !== 15033) throw new Error(`結果數量錯誤`);
answers.forEach(answer => {
	if (answer.length > 4) throw new Error(`結果至多 4 籃`);
	const sumAll = answer.reduce((prev, curr) => {
		if (curr.items.length > 5) throw new Error(`每個籃子至多 5 種東西`);
		const bucketSum = curr.items.reduce((prev, curr) => {
			return prev + curr.amount;
		}, 0);
		if (bucketSum === 0) throw new Error(`加總為零的籃子不應該出現在解答中`);
		if (curr.name === 'Bucket1' && bucketSum !== 3) throw new Error(`Bucket1 加總應為 3`);
		if (curr.name === 'Bucket2' && bucketSum !== 5) throw new Error(`Bucket2 加總應為 5`);
		if (curr.name === 'Bucket3' && bucketSum !== 2) throw new Error(`Bucket3 加總應為 2`);
		return prev + bucketSum;
	}, 0);
	if (sumAll !== 18) throw new Error(`所有籃子數量加總錯誤`);
});
