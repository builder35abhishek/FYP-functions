const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

let db = admin.firestore();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

exports.getStock = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('failed-precondition');
  }

  if (!data.stockCode) {
    return db.collection('stocks').get()
        .then((stocksSnapshot) => {
          let stocks = [];
          let stockCodeIndexMap = {};

          let i = 0;
          stocksSnapshot.forEach((stockSnapshot) => {
            stocks.push(stockSnapshot.data());
            stockCodeIndexMap[stockSnapshot.id] = i;
            i++;
          });

          return {stocks: stocks, stockCodeIndexMap: stockCodeIndexMap};
        })
        .catch((err) => {
          console.log(err);
          throw new functions.https.HttpsError('internal', 'get-stock-error', err);
        });
  } else {
    return db.collection('stocks').doc(data.stockCode).get()
        .then((stockSnapshot) => {
          if (!stockSnapshot.exists) {
            throw new functions.https.HttpsError('invalid-argument', 'stock-not-exists', err);
          }

          return {stock: stockSnapshot.data()};
        })
        .catch((err) => {
          console.log(err);
          throw new functions.https.HttpsError('internal', 'get-stock-error', err);
        });
  }
});

exports.insertStocks = functions.https.onRequest((req, res) => {
  if (req.method !== 'POST') {
    res.sendStatus(404);
  }

  let stockCollectionRef = db.collection('stocks');

  let insertStockPromises = [];
  for (let stockCode in req.body.stocks) {
    insertStockPromises.push(stockCollectionRef.doc(stockCode).set(req.body.stocks[stockCode]));
  }

  return Promise.all(insertStockPromises)
      .then(() => {
        return res.send(JSON.stringify(Object.keys(req.body.stocks)));
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(JSON.stringify({code: 'internal', message: 'insert-stocks-erorr', details: err}));
      });
});

exports.userProfileCreate = functions.auth.user().onCreate((user) => {
  const uid = user.uid;
  var data = {
    advanced: false
  };
  
  var setDoc = db.collection('users').doc(uid).set(data);
  return setDoc
});
