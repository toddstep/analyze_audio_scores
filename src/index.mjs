import * as fs from 'node:fs';
import {GetItemCommand, QueryCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb';

const html = fs.readFileSync('index.html', { encoding: 'utf8' });
// https://www.geeksforgeeks.org/node-js/how-to-return-an-array-of-lines-from-a-file-in-node-js/
const all_species = fs.readFileSync('all_species.txt', { encoding: 'utf8' })
                      .split('\n')
                      .map((x)=>x.split(',')[1]);
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/node-configuring-maxsockets.html
const dynamoClient = new DynamoDBClient({
    requestHandler: {
        requestTimeout: 30_000,
    },
});
const num_top_species = 5;

async function execute_query(command) {
    return await dynamoClient.send(new QueryCommand(command));
}

function default_date_time() {
    // https://www.geeksforgeeks.org/how-to-calculate-the-yesterdays-date-in-javascript/
    const millisecondsInDay = 1000*60*60*24;
    const today = new Date();
    const yesterday = new Date(today.getTime()-millisecondsInDay);
    const [from_date, from_time] = yesterday.toISOString().split('T');
    const [to_date, to_time] = today.toISOString().split('T');
    return {
        'from_date': from_date,
        'from_time': from_time.split(":").slice(0, 2).join(":"),
        'to_date': to_date,
        'to_time': to_time.split(":").slice(0, 2).join(":"),
    };
}

function set_html_date_time(params, html) {
    return html.replace("{FROM_DATE}", params.from_date)
               .replace("{FROM_TIME}", params.from_time)
               .replace("{TO_DATE}", params.to_date)
               .replace("{TO_TIME}",  params.to_time);
}

function convert_to_epoch(date, time) {
    return Date.parse(date + "T" + time + "Z") / 1000;
}

function max_scores(x) {
    x = x.map((x) => x.score.N);
    return Math.max(...x);
}

async function get_species(sp, from_time, to_time) {
    let command = {
        TableName: process.env.TABLE_NAME,
        ExpressionAttributeValues: {
            ':sp': {'S': String(sp)},
            ':start': {'N': String(from_time)},
            ':stop': {'N': String(to_time)},
        },
        KeyConditionExpression: 'species = :sp AND #t BETWEEN :start AND :stop',
        ProjectionExpression: 'score, #t',
        ExpressionAttributeNames: {'#t': 'time'},
        ReturnConsumedCapacity: 'TOTAL'
    };
    let all_items = [];
    let total_capacity_units = 0;
    let do_query = true;
    while (do_query) { 
        const res = await execute_query(command);
        total_capacity_units += res.ConsumedCapacity.CapacityUnits;
        all_items = all_items.concat(res.Items);
        if (res.LastEvaluatedKey) {
            command.ExclusiveStartKey = res.LastEvaluatedKey;
        }
        else {
            do_query = false;
        }
    }
    console.log("GET_SPECIES", sp, all_items.length, total_capacity_units);
    return all_items;
}

function chart_species(single_select_species, all_species_items) {
    const label = "label: '" + all_species[single_select_species[0]] + "'";
    const data = "data: [" + all_species_items[single_select_species[0]].map((x)=>x.score.N) + "]";
    return "{" + label + "," +  data + "}";
}

export const handler = async (event) => {
    // https://www.geeksforgeeks.org/python/javascript-equivalent-to-python-s-range-function/
    const params = event.queryStringParameters;
    let updateHtml = html;
    if (params == null) {
        const default_params = default_date_time();
        console.log('NO PARAMS', default_params);
        updateHtml = set_html_date_time(default_params, updateHtml)
                        .replace("{RESULTS_HEADER}", "");
    }
    else {
        console.log('PARAMS', params);
        const from_epoch = convert_to_epoch(params.from_date, params.from_time);
        const to_epoch = convert_to_epoch(params.to_date, params.to_time);
        const threshold = params.threshold;
        try {
            const all_species_items = await Promise.all(all_species.map((species) => get_species(species, from_epoch, to_epoch)));
            const timestamps = "[" + all_species_items[0].map((x) => x.time.N*1000 ) + "]";
            const select_species = all_species_items.map((x, idx) => [idx, max_scores(x)])
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, num_top_species);
            const chart_datasets = select_species.map((x)=> chart_species(x, all_species_items)).join(",");
            updateHtml = set_html_date_time(params, updateHtml)
                            .replace("{RESULTS_HEADER}", "<h2>Top scoring birds for window (using browser's time zone)</h2>")
                            .replace("{labels}", timestamps)
                            .replace("{datasets}", "[" + chart_datasets + "]");
        } catch (err) {
            updateHtml = set_html_date_time(params, updateHtml)
                             .replace("{RESULTS_HEADER}", err)
        }
    }
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: updateHtml,
    };
    return response;
};
