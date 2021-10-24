import * as fs from "fs"
import * as HTTP from "http"
import * as Tesseract from "./node_modules/tesseract.js"


//console.log(process.env)
process.env.TESSDATA_PREFIX = process.env.INIT_CWD+'\\tessdata'

const port: number = 80;
let imglist: string[] = fs.readdirSync('./img');
let langlist: string[] = fs.readdirSync('./tessdata').map(v => v.split('.')[0]);
const ocr_datas: { [key: string]: any } = {}
const ocr_per: { [key: string]: number } = {}
//https://stackoverflow.com/questions/56369167/install-tesseract-js
//npm i tesseract.js # https://www.npmjs.com/package/tesseract.js

const { createWorker } = Tesseract;

function POST(req: any, res: any, callback: ((res: any, buffer: Buffer | undefined) => void)) {
  const data: Buffer[] = [];
  req.on('error', () => { callback(res, undefined) });
  req.on('data', (chunk: Buffer) => { data.push(chunk) });
  req.on('end', () => { console.log('pposost', data); callback(res, Buffer.concat(data)) });
  return undefined;
}

function _404(res: any, url: String | void, err: String) {
  if (err) console.error('_404 fn err', url, err)
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('404 Page Not Found');
}


const httpserver = HTTP.createServer((req, res) => {
  const url: string | undefined = req.url;
  const method: string | undefined = req.method;
  const url_arr: string[] = typeof (url) == 'string' ? url.split('/') : []

  console.log('[url]', url, url_arr)


  if (url == '/') (res.statusCode = 200), (res.end(fs.readFileSync('./index.html')));
  if (url == '/list') {
    imglist = fs.readdirSync('./img');
    console.log(typeof (imglist));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf8' });
    res.end(JSON.stringify(imglist))
  }
  else if (url_arr[1] == 'hocr' && method == 'POST') {
    POST(req, res, (res, data) => {
      if (typeof data == 'undefined') _404(res, url, '없음');
      else {
        if (url_arr[2] == 'send') {
          try {
            let { rect, url, lang }: { rect: number[], url: string, lang: string } = JSON.parse(data.toString('utf8'));
            rect = rect.map(v => Math.floor(v));
            console.log(rect, url)

            const rectangle = {
              left: Math.min(rect[0], rect[2]),
              top: Math.min(rect[1], rect[3]),
              width: Math.abs(rect[0] - rect[2]),
              height: Math.abs(rect[1] - rect[3])
            };
            if (rect[2] * rect[3] == 0) throw ('사각형 이상한 범위');
            if (!langlist.includes(lang)) throw ('지원하지 않는 언어');
            if (rectangle.width * rectangle.height >= 1000 * 1000) throw ('사각형 너무큰 범위');
            if (rectangle.width * rectangle.height == 0) throw ('사각형 0같은 범위');


            if (!imglist.includes(url)) throw ('없는 이미지 요청됨');
            var image: string = './img/' + url;

            const key: string = 'k' + Math.random();


            (async (rectangle: any, lang: string, key: string) => {
              const worker = createWorker({
                logger: m => {
                  console.log(m.jobId, m.progress)
                  if (m.jobId) ocr_per[key] = m.progress;
                }
              });
              await worker.load();
              // await worker.setParameters({
              //   tessjs_create_hocr:'1'
              // })
              //const lan: string = 'kor'//kor

              //for (var i in worker)console.log(i)


              await worker.loadLanguage(lang);
              await worker.initialize(lang);

              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf8' });
              res.end(key)

              console.log('[lang]', lang, '[rectangle]', rectangle)
              const { data } = await worker.recognize(image, { rectangle });
              await worker.terminate()
              ocr_datas[key] = data;
              ocr_per[key] = 1.1


              //res.writeHead(200, { 'Content-Type': 'application/json; charset=utf8' });
              //res.end(JSON.stringify({ hocr: data.hocr, text: data.text }))
            })(rectangle, lang, key);

          } catch (err) {
            _404(res, url, '받는거 요류내역' + err);
          }
        }
        else if(url_arr[2] == 'state'){
          const key:string = data.toString('utf8');
          console.log(key)
          if(key in ocr_per){
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf8' });
            res.end(String(ocr_per[key]))
          }else _404(res,url,'키 없음')
        }
        else if(url_arr[2]=='datas'){
            const key:string = data.toString('utf8');
            console.log('[datas/key]',key)
            if(key in ocr_datas){
              const data = ocr_datas[key];
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf8' });
              res.end(JSON.stringify({ hocr: data.hocr, text: data.text }))
              //delete ocr_datas[key];
            }else _404(res,url,'키 없음')
        }
        else _404(res,url,'404')
        return;
      }
    })

  }
  else if (method == 'GET') {
    fs.readFile('.' + decodeURI(String(url)), null, (err, data) => {
      err ? (res.statusCode = 404, res.end('Page not found')) : (res.statusCode = 200, (res.end(data)));
    })
  }

  else res.statusCode = 404, res.end('Page not found');

}).listen(80, () => console.log(`server is running at localhost:${port}`))



// Tesseract.recognize(
//     './test6.png',
//     'kor',
//     { logger: m => console.log(m.jobId, m.progress) }
//   ).then(({ data: { text } }) => {
//     console.log(text);
//   })


// var image: string = './test.png';
// (async () => {
//   const worker = createWorker();
//   await worker.load();
//   // await worker.setParameters({
//   //   tessjs_create_hocr:'1'
//   // })
//   await worker.loadLanguage('kor');
//   await worker.initialize('kor');
//   const { data } = await worker.recognize(image);
//   console.log(data.text, data.hocr)

//   for (var i in data) {
//     console.log(i)
//   }

// })();

// //https://socket.io/docs/v3/server-initialization/
// import { Server, Socket } from 'socket.io';
// const io = new Server(httpserver);
// io.on("connection", (socket: Socket) => {  // ...});