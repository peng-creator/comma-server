import axios from "axios";
import { getSubtitles } from "node-youtube-subtitles";

import { getCaptions, getLanguages } from '@os-team/youtube-captions';


const { YoutubeDataAPI } = require("youtube-v3-api")
const API_KEY = 'AIzaSyDKx08OMjMDjiZW_yrwHJBM9_JlwnCAL3c';

const api = new YoutubeDataAPI(API_KEY);

export const searchYoutube = (keyword: string, pageToken?: string) => {
  return api.searchAll(keyword, 25, {
    part: 'snippet',
    type: 'video',
    regionCode: 'US',
    relevanceLanguage: 'en',
    videoCaption: 'closedCaption',
    ...(pageToken ? {pageToken} : {})
  })
};

export const getYoutubeSubtitles = async (videoId: string) => {
  // const languages = getLanguages(videoId); // ['en', 'de', 'pl', 'pt', 'es']
  try {
    const captions = await getCaptions(videoId, 'en'); // [{ start: 0, end: 1000, text: 'subtitle' }]
    return captions.map(({start, end, text}) => {
      console.log('text:', text);
      const arr = text.split(' ');
      let subtitle = text;
      if (arr.length > 0) {
        const firstWord = arr[0];
        const secondWord = arr[1];
        const sameIndex = arr.findIndex((w, i) => w === secondWord && i > 1);
        if (sameIndex > 1) {
          const preSameIndex = sameIndex - 1;
          const sameFirstWord = arr[preSameIndex];
          if (sameFirstWord.indexOf(firstWord) > -1) {
            subtitle = [firstWord, ...arr.slice(sameIndex)].join(' ');
          }
        }
      }
      return {
        start, end, subtitles: [subtitle],
      }
    })
  } catch(e) {
    console.log(`getCaptions(videoId, 'en') error:`, e);
  }

  // const subtitlePromise = axios.get('https://www.googleapis.com/youtube/v3/captions', {
  //   // headers: {

  //   // },
  //   params: {
  //     part: 'snippet',
  //     videoId,
  //     key: API_KEY,
  //   }
  // }).then((res) => {
  //   return res.data;
  // }).then(({items}) => {
  //   console.log('subtitle list items:', items);
  //   return items.find((item: any) => item.snippet.language === 'en')
  // }).then(({id}) => {
  //   return axios.get('https://www.googleapis.com/youtube/v3/captions/' + id, {
  //     params: {
  //       key: API_KEY,
  //     }
  //   })
  // }).then((res) => res.data);
  // subtitlePromise.then((data) => {
  //   console.log('subtitlePromise res:', data);
  // }).catch((e) => {
  //   console.log('subtitlePromise res:', e.response.data);
  // })
  // return subtitlePromise;
  return Promise.resolve([]);
};
