import { useState } from "react";
import Tesseract from "tesseract.js";
//Devamdaki arraye ekleme yapilarak dil eklenebilir.
const keywords = [
  [
    /Accounts reached \d+/i,
    /Story interactions \d+/i,
    /Sticker taps \d+/i,
    /Link Clicks \d+/i,
    /Accounts reached/i,
    /Post Interactions/i,
  ],
  [
    /Eri.*ilen hesaplar \d+/i,
    /Hikaye etkile.*imle.* \d+/i,
    /.*ikartma dokunmala.* \d+/i,
    /Baglant.* T.*klamala.* \d+/i,
    /Er.*len hesaplar/i,
    /cer.*k Etk.*le.*mler/i,
  ],
];

let clean = (text) => {
  let toBeReturned = "";
  Array.from(text).forEach((s) => {
    if (
      s !== "," &&
      s !== "." &&
      s !== "~" &&
      s !== "]" &&
      s !== "©" &&
      s !== "®" &&
      s !== "-"
    ) {
      toBeReturned += s;
    }
  });
  return toBeReturned;
};

let cleanArray = (array) => {
  //bos satir siler
  let toBeReturned = [];
  array.forEach((text) => {
    for (let j = 0; j < Array.from(text).length; j++) {
      if (Array.from(text)[j] !== " ") {
        toBeReturned.push(text);
        break;
      }
    }
  });
  return toBeReturned;
};

let arrayLogger = (array) => {
  array.forEach((text) => {
    console.log(text);
  });
};

function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

export default function StatisticsExtractor() {
  const [stats, setStats] = useState({
    accounts_reached: 0,
    story_interactions: 0,

    click_on_sticker: 0,
    click_on_link: 0,
  });
  const [errors, setErrors] = useState([false, false, false, false]);

  let errorSetter = (doneThat) => {
    let newErrors = errors;
    newErrors[0] = !doneThat[0];
    newErrors[1] = !doneThat[1];
    newErrors[2] = !doneThat[2];
    newErrors[3] = !doneThat[3];
    setErrors(newErrors);
  };

  const onValueChange = async (files) => {
    files = Array.from(files);

    let tempText = "";

    while (files.length > 0) {
      //poplaya poplaya texte döküyor
      tempText += (await Tesseract.recognize(files.shift(), "eng", {})).data
        .text;
    }

    tempText = clean(tempText);

    if (tempText === "") return;
    

    let tempTextArray = tempText.split(/\r?\n/); //yeni satira göre bölüyor
    //arrayLogger(tempTextArray);
    tempTextArray = cleanArray(tempTextArray); //bosluklardan temizliyor
    let doneThat = [false, false, false, false]; //bu iste hangi verileri aldigini kaydediyor ki tekrar ayni veriyi cekmeye kalkmasin
    let newStats = {
      accounts_reached: 0,
      story_interactions: 0,
      click_on_sticker: 0,
      click_on_link: 0,
    };
    for (let j = 0; j < tempTextArray.length; j++) {
      let line = tempTextArray[j];
      //console.log(line);

      keywords.forEach((keywordRegs) => {
        //türkce icin de ingce icin de kontrol ediyor
        for (let i = 0; i < keywordRegs.length; i++) {
          if (keywordRegs[0].test(line) && !doneThat[0]) {
            var accountsReached =
              line.split(/\s+/)[line.split(/\s+/).length - 1]; //sayiyi aliyor

            newStats.accounts_reached = accountsReached;
            //state update
            doneThat[0] = true; //yapma kontrolü
            break;
          } else if (keywordRegs[1].test(line) && !doneThat[1]) {
            var storyInteractions =
              line.split(/\s+/)[line.split(/\s+/).length - 1];

            newStats.story_interactions = storyInteractions;

            doneThat[1] = true;
            break;
          } else if (keywordRegs[2].test(line) && !doneThat[2]) {
            var stickerTaps = line.split(/\s+/)[line.split(/\s+/).length - 1];

            newStats.click_on_sticker = stickerTaps;

            doneThat[2] = true;
            break;
          } else if (keywordRegs[3].test(line) && !doneThat[3]) {
            var linkClicks = line.split(/\s+/)[line.split(/\s+/).length - 1];

            newStats.click_on_link = linkClicks;

            doneThat[3] = true;
            break;
          }
        }
      });
      if (doneThat[0] && doneThat[1] && doneThat[2] && doneThat[3]) break;
    } //buradan sonrasi failure durumlari icin
    //console.log(doneThat);
    if (!doneThat[0] || !doneThat[1]) {
      //eger kullanici dogru kismi yüklemediyse ama sansa alttaki grafik hali görünüyorsa/story degil de postsa
      for (let j = 0; j < tempTextArray.length; j++) {
        let line = tempTextArray[j];
        //console.log(line);
        keywords.forEach((keywordRegs) => {
          if (!doneThat[0] && keywordRegs[4].test(line)) {
            var accountsReached = tempTextArray[j - 1]; //bir üstteki sayi

            newStats.accounts_reached = accountsReached;

            doneThat[0] = true;
          } else if (!doneThat[1] && keywordRegs[5].test(line)) {
            var storyInteractions =
              line.split(/\s+/)[line.split(/\s+/).length - 1];

            if (isNumeric(storyInteractions)) {
              newStats.story_interactions = storyInteractions;

              doneThat[1] = true;
            }
          }
        });
        if (doneThat[0] && doneThat[1]) break;
      }
    }
    if (!doneThat[0]) {
      //eger kullanici dogru kismi yüklemediyse ama sansa alttaki grafik hali görünüyorsa tekrar
      for (let j = 0; j < tempTextArray.length; j++) {
        let line = tempTextArray[j];
        //console.log(line);
        keywords.forEach((keywordRegs) => {
          if (!doneThat[0] && keywordRegs[4].test(line)) {
            var accountsReached =
              parseInt(tempTextArray[j + 1].split(/\s+/)[0]) +
              parseInt(tempTextArray[j + 1].split(/\s+/)[1]); //follower non-follower toplami

            newStats.accounts_reached = accountsReached;

            doneThat[0] = true;
          }
        });
        if (doneThat[0]) break;
      }
    }
    console.log(newStats);
    setStats({ ...newStats });
    errorSetter(doneThat);
    console.log(doneThat);
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          onValueChange(e.target.files);
        }}
        multiple
      />
      <h3>Etkileşim Özeti</h3>
      Erişilen Kişiler{" "}
      {errors[0] && !stats[0] > 0 ? "Error" : stats.accounts_reached} <br />
      İçerik Etkilişimleri (Yanit & Paylaşım){" "}
      {errors[1] && !stats[1] > 0 ? "Error" : stats.story_interactions} <br />
      Çıkartma Dokunmaları{" "}
      {errors[2] && !stats[2] > 0 ? "Error" : stats.click_on_sticker} <br />
      Bağlantı Tıklamaları{" "}
      {errors[3] && !stats[3] > 0 ? "Error" : stats.click_on_link} <br />
    </div>
  );
}
