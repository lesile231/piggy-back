import type { LatLng } from "@/types/common";
import { localize } from "@/types/common";
import type { OutgoingMessage } from "@/services/bot/types";

export class TaxiService {
  generateDeepLinks(from: LatLng, to: LatLng, language: string): OutgoingMessage {
    const kakaoUrl = `https://t.kakao.com/launch?dest_lat=${to.latitude}&dest_lng=${to.longitude}`;
    const uberUrl = `https://m.uber.com/ul/?pickup[latitude]=${from.latitude}&pickup[longitude]=${from.longitude}&dropoff[latitude]=${to.latitude}&dropoff[longitude]=${to.longitude}`;

    const text = localize(
      {
        en: "You can also take a taxi:",
        ko: "택시를 이용할 수도 있습니다:",
        ja: "タクシーも利用できます:",
        zh: "您也可以乘坐出租车:",
      },
      language,
    );

    return {
      type: "buttons",
      text,
      buttons: [
        { id: kakaoUrl, label: "KakaoT" },
        { id: uberUrl, label: "Uber" },
      ],
    };
  }
}
