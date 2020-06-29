const cron = require("node-cron");
const qs = require('querystring');
const axios = require('axios');
const moment = require('moment');

const TelegramBot = require('node-telegram-bot-api');
var token = 'input your token' //                  
const bot = new TelegramBot(token, { polling: true });
var isWaiting = false;
var autoGetCandle = false;
var myTelegramId = '';
cron.schedule("5 * * * * *", function () {
    if (isWaiting) {
        getResult(myTelegramId);
        isWaiting = false;
    }
});
cron.schedule("2 * * * * *", function () {
    if (autoGetCandle) {
        getCandle(myTelegramId);
    }
});
bot.onText(/^\/(l|L)ogin$/, (msg, match) => {
    botSendMessage(msg.chat.id, 'Please enter flow command:\n /Livenumber&password. Ví dụ: /L900001&123456.')
});
bot.onText(/^\/L\s*([0-9]+)*&([a-zA-Z0-9#?!@$%^&*-]+)$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    if (msg.text == '/Livenumber&password') {
        botSendMessage(msg.chat.id, 'Please enter flow command: \n /Livenumber&password. Ví dụ: /L900001&123456.');
        return;
    }
    myTelegramId = msg.chat.id;
    bot.deleteMessage(msg.chat.id, msg.message_id);
    let info = msg.text.substring(1).split("&");
    if (info.length < 1)
        return;

    getToken(info[0], info[1]).then(d => {
        botSendMessage(msg.chat.id, 'Login successfully');
    }).catch(err => {
        botSendMessage(msg.chat.id, err.errorMessage);
    });
});

bot.onText(/^\/((b|s)[1-9]+[0-9]*)+$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    var cmd = msg.text.substring(1);
    console.log(cmd)
    if (cmd.startsWith('b')) {
        Order(cmd.substring(1), 1).then(d => {
            isWaiting = true;
            botSendMessage(msg.chat.id, `Order: Buy ${cmd.substring(1)}`);
        }).catch(err => {
            botSendMessage(msg.chat.id, err.errorMessage);
        });
    }
    if (cmd.startsWith('s')) {
        Order(cmd.substring(1), 0).then(d => {
            isWaiting = true;
            botSendMessage(msg.chat.id, `Order: Sell ${cmd.substring(1)}`);
        }).catch(err => {
            botSendMessage(msg.chat.id, err.errorMessage);
        });
    }
});
bot.onText(/^\/balance$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getBalance().then(d => {
        botSendMessage(msg.chat.id, d.data.balance);
    }).catch(err => {
        botSendMessage(msg.chat.id, err.errorMessage);
    });
});
bot.onText(/^\/result$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getResult(msg.chat.id);
});
bot.onText(/^\/today$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getHistoryToday().then(d => {
        const result = d.data.total;
        const listOrder = d.data.data;
        var txt = `<b>Today</b>\n\Begin: ${result.begin || 0}\n\Waiting: ${result.waiting || 0}\n\Deposit: ${result.deposit || 0}\n\Withdraw: ${result.withdraw || 0}\n\Profit: ${result.profit || 0}\n\Balance: ${result.balance || 0}\n`;
        botSendMessage(msg.chat.id, txt, { parse_mode: 'HTML' });

    }).catch(err => {
        botSendMessage(msg.chat.id, err.errorMessage);
    });
});
bot.onText(/^\/week$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getHistoryWeek().then(d => {
        const result = d.data.total;
        const listOrder = d.data.data;
        var txt = `<b>Week</b>\n\Begin: ${result.begin || 0}\n\Waiting: ${result.waiting || 0}\n\Deposit: ${result.deposit || 0}\n\Withdraw: ${result.withdraw || 0}\n\Profit: ${result.profit || 0}\n\Balance: ${result.balance || 0}\n`;
        botSendMessage(msg.chat.id, txt, { parse_mode: 'HTML' });
    }).catch(err => {
        botSendMessage(msg.chat.id, err.errorMessage);
    });
});
bot.onText(/^\/month$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getHistoryMonth().then(d => {
        const result = d.data.total;
        const listOrder = d.data.data;
        var txt = `<b>Month</b>\n\Begin: ${result.begin || 0}\n\Waiting: ${result.waiting || 0}\n\Deposit: ${result.deposit || 0}\n\Withdraw: ${result.withdraw || 0}\n\Profit: ${result.profit || 0}\n\Balance: ${result.balance || 0}\n`;
        botSendMessage(msg.chat.id, txt, { parse_mode: 'HTML' });
    }).catch(err => {
        botSendMessage(msg.chat.id, err.errorMessage);
    });
});
bot.onText(/^\/candle$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    getCandle(msg);
});
bot.onText(/^\/autocandle$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    autoGetCandle = true;
});
bot.onText(/^\/offcandle$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    autoGetCandle = false;
});
bot.onText(/^\/help|start$/, (msg, match) => {
    if (msg.from.is_bot) {
        return;
    }
    var txt = "Bạn sử dụng Bot bằng cách gửi những tin nhắn sau đây:\n\
    /login - Login để bắt đầu.\n\
    /help - Xem hướng dẫn.\n\
    /b[A] - Vào lệnh Buy, [A] là số tiền vào lệnh. \n\
    /s[A] - Vào lệnh Sell, [A] là số tiền vào lệnh.\n\
    /balance - Xem balance live account \n\
    /result - Xem kết quả vào lệnh gần nhất \n\
    /today - Xem profit ngày hôm nay \n\
    /week - Xem profit tuần \n\
    /month - Xem profit tháng \n\
    /candle - Xem 10 cây nến gần nhất \n\
    /autocandle - Tự động gửi tín hiệu nến \n\
    /offcandle - Tắt tự động gửi tín hiệu nến \n\
    ";
    botSendMessage(msg.chat.id, txt, { parse_mode: 'HTML' });
});
function getCandle(id) {
    getCandlesticks(10).then(d => {
        var candles = d.data.map((e) => { return e.open > e.close ? 0 : 1; }).reverse();
        var candlearr = [];
        candles.forEach((e) => {
            candlearr.push(e);
        });
        var sticks = buildSticksMessage(candlearr);
        botSendMessage(id, sticks);
    }).catch(err => {
        botSendMessage(id, err.errorMessage);
    });
}

function getResult(id) {
    getResultOrder().then(d => {
        const result = d.data;
        if (d.data.totalProfit > 0) {
            botSendSticker(id, 'CAADAgADLVQAAp7OCwAB3ByKGvkbQr8WBA');
        }
        var txt = `<b>Result is ${result.result == 1 ? 'BUY' : 'SELL'} </b>\n\Time: ${result.candleTime} \n\Buy: ${result.totalBuy || 0}\n\Sell: ${result.totalSell || 0}\n\Profit: ${result.totalProfit || 0}\n`;
        botSendMessage(id, txt, { parse_mode: 'HTML' });
    }).catch(err => {
        botSendMessage(id, err.errorMessage);
    });
}

function fetchGet(url, data, callback) {
    axios.get(url, data)
        .then(function (response) {
            callback(1, response)
            //console.log(response.data);
        })
        .catch(function (error) {
            console.log(error.response);
            callback(0, error.response)
        })
        .finally(function () {
            // always executed
        });
}
function fetchPost(url, data, callback) {
    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    }
    axios.post(url, data, config)
        .then((result) => {
            // Do somthing
            callback(1, result.data)
        })
        .catch((err) => {
            // Do somthing            
            console.log(err.response);
            callback(0, err.response)
        })
}
function getToken(accountName, password) {
    return new Promise((resolve, reject) => {
        var acc = {
            "AccountName": accountName,
            "Password": password
        }
        fetchPost('https://api.ibrokers.io/api/Account/Login', acc, (st, data) => {
            if (st == 1) {
                var result = data.data;
                axios.defaults.headers.common['Authorization'] = `Bearer ${result.token}`;
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    });

}
function Order(amount = 1, type = 1) {
    return new Promise((resolve, reject) => {
        var order = {
            "Amount": Number(amount),
            "BetType": type
        }
        console.log(order);
        fetchPost('https://api.ibrokers.io/api/Account/AccountPlaceOrder', order, (st, data) => {
            if (st == 1) {
                var result = data.data;
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    });

}
function getCandlesticks(num = 10) {
    return new Promise((resolve, reject) => {
        var qs = { NumOfCandle: num }
        fetchGet('https://api.ibrokers.io/api/Account/CandleChartGetPrice', { params: qs }, (st, data) => {
            if (st == 1) {
                var result = data.data;
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    })
}
function getResultOrder() {
    return new Promise((resolve, reject) => {
        fetchGet('https://api.ibrokers.io/api/Account/GetResultOrder', null, (st, data) => {
            if (st == 1) {
                var result = data.data;
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    })
}
function getBalance() {
    return new Promise((resolve, reject) => {
        fetchGet('https://api.ibrokers.io/api/Account/GetBalance', null, (st, data) => {
            if (st == 1) {
                var result = data.data;
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    });
}
function getOrderHistory(to, from = '2020-01-01', pageIndex = 1, pagesize = 999) {
    return new Promise((resolve, reject) => {
        var qr = { PageIndex: pageIndex, FromDate: from, ToDate: to, Pagesize: pagesize }
        fetchGet('https://api.ibrokers.io/api/Account/BotPlaceOrderHistory', {
            params: qr
        }, (st, data) => {
            if (st == 1) {
                var result = data.data;
                console.log(result);
                resolve(result);
            } else {
                reject(data.data)
            }
        })
    });
}
function getHistoryToday(pageIndex = 1, pagesize = 999) {
    const to = moment().utc().toDate();
    let from = moment().utc().startOf('date').toDate();
    return getOrderHistory(to, from, pageIndex, pagesize);
}
function getHistoryWeek(pageIndex = 1, pagesize = 999) {
    const to = moment().utc().toDate();
    let from = moment().utc().startOf('week').toDate();
    return getOrderHistory(to, from, pageIndex, pagesize);
}
function getHistoryMonth(pageIndex = 1, pagesize = 999) {
    const to = moment().utc().toDate();
    let from = moment().utc().startOf('month').toDate();
    return getOrderHistory(to, from, pageIndex, pagesize);
}

function botSendMessage(id, msg, options) {
    bot.sendMessage(id, msg, options).then(function (resp) {
        // ...snip...
    }).catch(function (error) {
        if (error.response && error.response.statusCode === 403) {
            // ...snip...
            console.log('blocked: ' + id);
            //removeInfo(id, -1);
        }
    });
}
function botSendSticker(id, msg, options) {
    bot.sendSticker(id, msg, options).then(function (resp) {
        // ...snip...
    }).catch(function (error) {
        if (error.response && error.response.statusCode === 403) {

        }
    });
}
function buildSticksMessage(sticks) {
    var text = '';
    if (!sticks)
        return text;
    for (var i = 0; i < sticks.length; i++) {
        if (sticks[i] == 0) {
            text += "\ud83c\udf4e";
        }
        else if (sticks[i] == 1) {
            text += "\ud83c\udf4f";
        }
    }
    return text;
}
