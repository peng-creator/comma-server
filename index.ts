import { ZoneDefinition } from './src/types/Zone';
import { loadDirChildren } from './src/resourceLoader';
import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import { COMMA_HOME } from './src/constant';
import path from 'path';
import { getSubtitleOfVideo } from './src/subtitle';
import { Ass } from './src/subtitle/ass/ass';
import bodyParser from 'body-parser';
import { getCardCollection } from './src/card/getCardCollection';
import { getAllCardCollections, saveCard, searchFlashCardCollections } from './src/card/searchCardCollection';
import WebSocket from 'ws';
import proxy from 'express-http-proxy'
// const streamer = require("./node-http-streamer/index.js");
// import serveStatic from 'serve-static';
import { networkInterfaces } from 'os';
import { getYoutubeSubtitles, searchYoutube } from './src/youtube/youtube';


const app = express();

app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json({
  limit: '10mb'
}));

expressWs(app);

app.get('/api/resource/children', (req, res) => {
  loadDirChildren('').then((data) => {
    res.json(data);
  });
});

app.get('/api/resource/children/:dir', (req, res) => {
  loadDirChildren(req.params.dir).then((data) => {
    res.json(data);
  });
});

app.get('/resource/*', (req, res) => {
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
  res.sendFile(path.join(COMMA_HOME, decodeURIComponent(req.url)));
});

app.get('/api/youtube/:keyword', (req, res) => {
  searchYoutube(req.params.keyword).then((searchResult: any) => {
    res.send(searchResult)
  }).catch((e: any) => {
    res.status(500);
    res.send(e);
  });
});

app.get('/api/youtube/subtitles/:videoId', (req, res) => {
  getYoutubeSubtitles(req.params.videoId).then((searchResult: any) => {
    res.send(searchResult);
  }).catch((e: any) => {
    res.status(500);
    res.send(e);
  });
});

app.get('/api/youtube/:keyword/:pageToken', (req, res) => {
  searchYoutube(req.params.keyword, req.params.pageToken).then((searchResult: any) => {
    res.send(searchResult)
  }).catch((e: any) => {
    res.status(500);
    res.send(e);
  });
});

process.on("uncaughtException", (e) => console.log("uncaughtException:", e));

app.get('/ipaddress', () => {
  const nets = networkInterfaces();
  const results: any = {};
  for (const name of Object.keys(nets)) {
    let netList = nets[name];
    if (netList === undefined) {
      break;
    }
    for (const net of netList) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
      if (net.family === familyV4Value && !net.internal) {
          if (!results[name]) {
              results[name] = [];
          }
          results[name].push(net.address);
      }
    }
  }
  return results;
});

// getting the subtitle of the video filePath, filePath 为resource的子路径
app.get('/api/video/subtitle/:filePath', (req, res) => {
  const videoPath = path.join(COMMA_HOME, 'resource', req.params.filePath); 
  console.log('start trying to loading subtitle of video:', videoPath);
  getSubtitleOfVideo(videoPath).then((result) => {
    console.log('send back subtitle of ', videoPath, ', subtitle length:', result.length);
    res.json(result);
  }).catch(e => {
    res.status(500);
    res.json([]);
  });
});

// getting the subtitle of the video filePath, filePath 为resource的子路径
app.post('/api/video/subtitle/:filePath', (req, res) => {
  const videoPath = path.join(COMMA_HOME, 'resource', req.params.filePath);
  console.log('saving subtitle of video:', videoPath);
  console.log('subtitle:', req.body);
  Ass.saveByVideoSrc(videoPath, req.body).then(() => {
    res.send('success');
  });
});

app.get('/api/card/:collectionName', (req, res) => {
  getCardCollection(req.params.collectionName)
  .then((result) => {
    res.json(result);
  }).catch(e => {
    res.status(500);
    res.json([]);
  });
});

app.get('/api/card', (req, res) => {
  res.json(getAllCardCollections());
});

app.get('/api/card/collectionName/:search', (req, res) => {
  const search = req.params.search;
  if (search) {
    const result = searchFlashCardCollections(search);
    res.json(result);
  } else {
    res.status(400);
  }
});

app.post('/api/card', (req, res) => {
  saveCard(req.body).then(() => {
    res.send('success');
  }).catch(e => {
    res.status(500);
    res.send(e);
  })
});

let zones: Map<string, ZoneDefinition> = new Map();

setInterval(() => {
  zones = [...zones.values()].filter(zone => {
    return Date.now().valueOf() - zone.registerTimeStamp < 60000;
  }).reduce((acc, curr) => {
    acc.set(curr.id, curr);
    return acc;
  }, new Map());
}, 10000);

app.get('/api/zone', (req, res) => {
  res.json([...zones.values()]);
});

app.delete('/api/zone/:id', (req, res) => {
  zones.delete(req.params.id)
  res.send('success');
});

app.post('/api/zone/register', (req, res) => {
  for (let zone of req.body) {
    zones.set(zone.id, zone);
  }
  res.send('success');
});


const wsList = new Set<WebSocket>();
(app as any).ws('/', function(ws: WebSocket, req: any) {
  wsList.add(ws);
  ws.on('message', function(msg: string) {
    if (msg === '__ping__') {
      ws.send('__pong__');
      return;
    }
    wsList.forEach((_ws) => {
      if (_ws === ws) {
        return;
      }
      _ws.send(msg);
    })
    console.log(msg);
  });
  ws.on('close', () => {
    wsList.delete(ws);
  })
  // console.log('socket', req.testing);
});

app.listen(8080)
