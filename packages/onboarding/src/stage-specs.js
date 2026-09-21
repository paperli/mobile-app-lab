export const stageSpecs={
  "jeopardy": {
    "src": "assets/jeopardy-stage-concept.jpg",
    "parts": [
      {
        "id": "backdrop",
        "label": "Blue cyclorama",
        "path": "M280 118H1258V647H280Z",
        "from": "translateY(65px) scale(.96)",
        "delay": 80,
        "duration": 1600
      },
      {
        "id": "wing-left",
        "label": "Left blue wing",
        "path": "M0 100H187V748H0Z",
        "from": "translateX(-260px)",
        "delay": 220,
        "duration": 1500
      },
      {
        "id": "wing-right",
        "label": "Right blue wing",
        "path": "M1350 100H1536V748H1350Z",
        "from": "translateX(260px)",
        "delay": 360,
        "duration": 1500
      },
      {
        "id": "floor",
        "label": "Blue floor reflections",
        "path": "M0 717H1536V864H0Z",
        "from": "translateY(0)",
        "delay": 700,
        "duration": 1700
      },
      {
        "id": "platform",
        "label": "Gold-edged riser",
        "path": "M111 664Q330 610 768 618Q1214 610 1423 664L1414 737Q771 754 115 733Z",
        "from": "translateY(135px)",
        "delay": 180,
        "duration": 1550
      },
      {
        "id": "column-left",
        "label": "Left illuminated column",
        "path": "M179 79L285 92L279 657L267 674L177 669L177 625Z",
        "from": "translateX(-340px)",
        "delay": 520,
        "duration": 1650
      },
      {
        "id": "column-right",
        "label": "Right illuminated column",
        "path": "M1251 89L1359 77L1364 665L1261 674L1253 640Z",
        "from": "translateX(340px)",
        "delay": 700,
        "duration": 1650
      },
      {
        "id": "crown",
        "label": "Blue and gold overhead cornice",
        "path": "M176 54Q174 11 239 23C583 82 968 82 1304 23Q1365 10 1367 57L1361 112Q1356 142 1287 150C936 181 591 180 246 151Q179 142 173 107Z",
        "from": "translateY(-235px)",
        "delay": 1040,
        "duration": 1750
      }
    ]
  },
  "wheel": {
    "src": "assets/wheel-stage-palmless.png",
    "foregroundSrc": "assets/wheel-stage-concept.jpg",
    "parts": [
      {
        "id": "backdrop",
        "label": "Teal cyclorama and uplights",
        "path": "M250 171H1290V615H250Z",
        "from": "translateY(60px) scale(.97)",
        "delay": 30,
        "duration": 1550
      },
      {
        "id": "wing-left",
        "label": "Left sunset wing",
        "path": "M0 0H193V674H0Z",
        "from": "translateX(-250px)",
        "delay": 250,
        "duration": 1600
      },
      {
        "id": "wing-right",
        "label": "Right sunset wing",
        "path": "M1342 0H1536V674H1342Z",
        "from": "translateX(250px)",
        "delay": 380,
        "duration": 1600
      },
      {
        "id": "floor",
        "label": "Teal and gold floor reflections",
        "path": "M0 700H1536V864H0Z",
        "from": "translateY(0)",
        "delay": 900,
        "duration": 1800
      },
      {
        "id": "platform",
        "label": "Curved gold-edged platforms",
        "path": "M194 575H1346V650H194Z M0 651Q766 596 1536 651V742Q767 686 0 742Z",
        "from": "translateY(125px)",
        "delay": 160,
        "duration": 1600
      },
      {
        "id": "column-left",
        "label": "Left gold arch support",
        "path": "M185 238H262V560L250 579V624L168 637L169 601Z",
        "from": "translateX(-310px)",
        "delay": 520,
        "duration": 1600
      },
      {
        "id": "column-right",
        "label": "Right gold arch support",
        "path": "M1265 238H1348L1368 623L1288 636L1273 602Z",
        "from": "translateX(310px)",
        "delay": 680,
        "duration": 1600
      },
      {
        "id": "crown",
        "label": "Teal and gold curved arch",
        "path": "M182 249C464 -44 1070 -44 1354 249L1306 354C1049 146 491 146 251 354L227 301Z",
        "from": "translateY(-235px) scale(.96)",
        "delay": 960,
        "duration": 1800
      },
      {
        "id": "palm-left",
        "label": "Inner left palm",
        "path": "M267 476L273 450L297 462L286 423L310 449L301 410L321 427L333 410L351 438L369 418L413 417L382 443L412 449L389 461L424 479L393 488L428 506L398 509L421 529L381 515L371 551L373 611L314 615L313 557L299 542L280 568L280 523L261 549L264 512L251 520L263 496L242 488Z",
        "from": "translateX(-250px) translateY(45px)",
        "delay": 1710,
        "duration": 1500
      },
      {
        "id": "palm-right",
        "label": "Inner right palm",
        "path": "M1109 478L1125 459L1115 432L1143 446L1139 414L1164 434L1181 411L1196 432L1227 415L1221 449L1254 447L1238 468L1271 482L1242 500L1264 517L1235 516L1247 547L1218 529L1212 565L1222 609L1160 615L1158 557L1141 540L1129 561L1121 531L1101 540L1115 504L1094 510Z",
        "from": "translateX(250px) translateY(45px)",
        "delay": 1870,
        "duration": 1500
      },
      {
        "id": "palm-front-left",
        "label": "Foreground left palm",
        "path": "M0 443L24 458L20 440L44 470L60 465L82 446L99 454L82 482L113 471L121 484L107 496L134 507L103 526L130 543L104 555L113 581L82 573L84 647L0 650Z",
        "from": "translateX(-180px) translateY(55px)",
        "delay": 2040,
        "duration": 1450
      },
      {
        "id": "palm-front-right",
        "label": "Foreground right palm",
        "path": "M1536 442L1512 453L1498 440L1492 468L1467 455L1446 449L1441 464L1454 482L1418 474L1411 490L1430 503L1399 512L1425 530L1401 548L1435 553L1422 581L1450 574L1450 647L1536 650Z",
        "from": "translateX(180px) translateY(55px)",
        "delay": 2200,
        "duration": 1450
      }
    ]
  }
};
