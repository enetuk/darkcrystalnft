const { createCanvas, loadImage } = require("canvas");

import {
  createAssociatedTokenAccountInstruction,
  createMetadataInstruction,
  createMasterEditionInstruction,
  createUpdateMetadataInstruction,
} from '../helpers/instructions';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import {
  getTokenWallet,
  getMetadata,
  getMasterEdition,
} from '../helpers/accounts';
import * as anchor from '@project-serum/anchor';
import { Creator, METADATA_SCHEMA } from '../helpers/schema';
import { serialize } from 'borsh';
import { TOKEN_PROGRAM_ID } from '../helpers/constants';
import fetch from 'node-fetch';
import { MintLayout, Token } from '@solana/spl-token';
import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import log from 'loglevel';
import {
  CreateMetadataV2Args,
  UpdateMetadataV2Args,
  CreateMasterEditionV3Args,
  DataV2,
  Collection,
  Uses,
  VerifyCollection,
} from '@metaplex-foundation/mpl-token-metadata';

export const createMetadata = async (
  metadataLink: string,
  collection: PublicKey,
  uses?: Uses,
): Promise<DataV2> => {
  // Metadata
  let metadata;
  try {
    //var fs = require('fs');
    //log.info("read file");
    //log.info(metadataLink);
    //metadata = JSON.parse(fs.readFileSync(metadataLink));
    //log.info(metadata);  
    metadata = await (await fetch(metadataLink, { method: 'GET' })).json();

  } catch (e) {
    log.info(e);
    log.error('Invalid metadata at', metadataLink);
    return;
  }
  // Validate metadata
  if (
    !metadata.name ||
    !metadata.image ||
    isNaN(metadata.seller_fee_basis_points) ||
    !metadata.properties ||
    !Array.isArray(metadata.properties.creators)
  ) {
    log.error('Invalid metadata file', metadata);
    return;
  }

  // Validate creators
  const metaCreators = metadata.properties.creators;
  if (
    metaCreators.some(creator => !creator.address) ||
    metaCreators.reduce((sum, creator) => creator.share + sum, 0) !== 100
  ) {
    return;
  }

  const creators = metaCreators.map(
    creator =>
      new Creator({
        address: creator.address,
        share: creator.share,
        verified: 1,
      }),
  );
  return new DataV2({
    symbol: metadata.symbol,
    name: metadata.name,
    uri: metadataLink,
    sellerFeeBasisPoints: metadata.seller_fee_basis_points,
    creators: creators,
    collection: collection
      ? new Collection({ key: collection.toBase58(), verified: false })
      : null,
    uses,
  });
};


//Генерирует случайное число от 0 до max-1
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export const createLootbox = (
  //Ключ создателя
  walletKeypair: Keypair,
  //Имя файла для сохранения информации об NFT-токене
  filename: string,
  //Имя файла для Изображения NFT-токена
  image_filename: string,
  //url Изображения NFT-токена
  image_url: string,
  //Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический
  mod: number,
  series_name: string,
  seller_fee_basis_points
) => {
  //Получаем кошелек из ключа
  const wallet = new anchor.Wallet(walletKeypair);
  if (!wallet?.publicKey) return;


  var nft_name = modNames()[mod];
  if(nft_name != ""){
      nft_name = nft_name + " ";
  };
  nft_name = nft_name + "Lootbox"
  //Заполняем свойства NFT-токена
  var nft_hash = {
    //Имя токена = модификатор + "Lootbox"
    "name": nft_name,
    "symbol": "",
    //Описание токена
    "description": nft_name,
    //Комиссия которую получает создатель токена (игра), при вторичных продажах
    //Royalty basis points that goes to creators in secondary sales (0-10000).
    "seller_fee_basis_points": seller_fee_basis_points,
    //Изображение токена
    "image": image_url,
    //Описание коллекции в которой будет этот NFT
    "collection": {
       "name": series_name,
       "family": "DarkCrystal Lootboxes" 
    },
    //Харкатеристики (заполняем ниже)
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Lootbox",
      },
      {
        //Серия лутбокса
        "trait_type": "Series",
        "value": series_name
      },
      {
        //Модификатор
        "trait_type": "Mod",
        "value": modNames()[mod]
      }
    ],
    //Информация о создателе токена (кошелек игры)
    "properties": {
      "creators": [
        {
          "address": wallet?.publicKey.toBase58(),
          "share": 100
        }
      ]
    }
  };

  //Сохраняем в файл JSON с информацией об агенте
  var fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify(nft_hash), 'utf8');
  //metadata = JSON.parse(fs.readFileSync(metadataLink));

  //Генерируем изображение


  var  canvas = createCanvas(400, 400);
  
  //Фон для лутбокса
  var Canvas = require('canvas');
  var bgimg = new Canvas.Image;
  bgimg.src = fs.readFileSync("./img_tmpls/lootbox_" + mod + ".png");


  var ctx = canvas.getContext("2d");
  ctx.drawImage(bgimg, 0, 0, bgimg.width, bgimg.height);
//  ctx.fillStyle = "blue";
//  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "24px serif";
  ctx.fillText(nft_hash["name"], 20, 40);

  //Сохраняем изображение
  fs.writeFileSync(
    image_filename,
    canvas.toBuffer("image/png")
  );


  //log.info(nft_hash);
  return nft_hash;

};

  //Названия фракций
function fractionNames(){
  return ["Сommittee", "Picnic", "Church", "Phalanx", "Fops"];
};

  //Названия классов
function classNames(){
  return ["Recon", "Ranger", "Supporter", "Defender", "Assaulter"];
};

  //Названия модификаторов
function modNames(){
   return ["", "Rare ", "Legendary ", "Epic "];
}

export const generateAgent = (
  //Ключ создателя
  walletKeypair: Keypair,
  //Имя файла для сохранения информации об NFT-токене
  filename: string,
  //Имя файла для Изображения NFT-токена
  image_filename: string,
  //url Изображения NFT-токена
  image_url: string,
  //Фракция: 0 - Комитет, 1 - Пикник, 2 - Церковь, 3 - Фаланга, 4 - Хлыщи
  fraction: number,
  //Модификатор: 0 - обычный, 1 - редкий, 2 - легендарный, 3 - эпический
  mod: number,
  seller_fee_basis_points
) => {
  //Получаем кошелек из ключа
  const wallet = new anchor.Wallet(walletKeypair);
  if (!wallet?.publicKey) return;
  //Названия фракций
  var fraction_names = fractionNames();

  //Названия классов
  var class_names = classNames();

  //Названия модификаторов
  var mod_names = modNames();

  
  //Случайным образом выбираем класс
  var class_number = getRandomInt(6);


  //Заполняем свойства NFT-токена
  var nft_hash = {
    //Имя токена модификатор + фракция + класс
    "name": mod_names[mod] + fraction_names[fraction] + " " + class_names[class_number],
    "symbol": "",
    //Описание токена
    "description": mod_names[mod] + fraction_names[fraction] + " " + class_names[class_number],
    //Комиссия которую получает создатель токена (игра), при вторичных продажах
    //Royalty basis points that goes to creators in secondary sales (0-10000).
    "seller_fee_basis_points": seller_fee_basis_points,
    //Изображение токена
    "image": image_url,
    //Описание коллекции в которой будет этот NFT
    "collection": {
       "name": "DarkCrystal Agents",
       "family": "DarkCrystal" 
    },
    //Харкатеристики (заполняем ниже)
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Agent"
      },

      {
        "trait_type": "Fraction",
        "value": fraction_names[fraction]
      },
      {
        "trait_type": "Class",
        "value": class_names[class_number]
      },
      {
        "trait_type": "Mod",
        "value": mod_names[mod]
      }
    ],
    //Информация о создателе токена (кошелек игры)
    "properties": {
      "creators": [
        {
          "address": wallet?.publicKey.toBase58(),
          "share": 100
        }
      ]
    }
  };

  //Заполняем Харкатеристики агента
  /*
  Комитет:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 125 - 150
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
  */
  var attributes = {};

  if(fraction == 0){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 125 + getRandomInt(26);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };
/*
Пикник:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 5 - 10
*/
  if(fraction == 1){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 5 + getRandomInt(6);
  };

/*
Церковь:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/
  if(fraction == 2){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };

/*
Фаланга:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 5 - 10
Скорость: 10 - 15 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/

  if(fraction == 3){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 5 + getRandomInt(6);
      attributes["Speed"] = 10 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };

/*
Хлыщи:
Мин. Урон: 5 - 20
Макс. Урон: 25 - 40
Стойкость: 70 - 100
Броня: 5 - 10
Уклонение: 1 - 3
Скорость: 20 - 25 а/м
Физическая защита: 0 - 5
Псионическая защита: 0 - 5
Удача: 1 - 2
*/

  if(fraction == 4){
      attributes["minDamage"] = 5 + getRandomInt(16);
      attributes["maxDamage"] = 25 + getRandomInt(16);
      attributes["HitPoints"] = 70 + getRandomInt(31);
      attributes["Defence"] = 5 + getRandomInt(6);
      attributes["Evasion"] = 1 + getRandomInt(3);
      attributes["Speed"] = 20 + getRandomInt(6);
      attributes["PhysicalResistance"] = 0 + getRandomInt(6);
      attributes["PsionicResistance"] = 0 + getRandomInt(6);
      attributes["Fortune"] = 1 + getRandomInt(2);
  };  

  //Добавляем Влияние Модификаторов рангов на стартовые бонусы к статам
  /*
Редкий агент
Скорость: +1 – 2
Уклонение: +1 – 2
Физическая защита: +1 - 3
Псионическая защита: +1 - 3
Удача: +1 - 2
*/
  if(class_number == 1){
      attributes["Speed"] += (1 + getRandomInt(2));
      attributes["Evasion"] += (1 + getRandomInt(2));
      attributes["PhysicalResistance"] += (1 + getRandomInt(3));
      attributes["PsionicResistance"] += (1 + getRandomInt(3));
      attributes["Fortune"] += (1 + getRandomInt(2));
  };

  /*
Легендарный агент
Скорость: +3 - 4
Уклонение: +3 - 4
Физическая защита: +4 - 7
Псионическая защита: +4 - 7
Удача: +3 - 4
*/
  if(class_number == 2){
      attributes["Speed"] += (3 + getRandomInt(2));
      attributes["Evasion"] += (3 + getRandomInt(2));
      attributes["PhysicalResistance"] += (4 + getRandomInt(4));
      attributes["PsionicResistance"] += (4 + getRandomInt(4));
      attributes["Fortune"] += (3 + getRandomInt(2));
  };

  /*
Эпический агент
Скорость: +5 - 6
Уклонение: +5 - 6
Физическая защита: +8 - 10
Псионическая защита: +8 - 10
Удача: +5
*/
  if(class_number == 3){
      attributes["Speed"] += (5 + getRandomInt(2));
      attributes["Evasion"] += (5 + getRandomInt(2));
      attributes["PhysicalResistance"] += (8 + getRandomInt(3));
      attributes["PsionicResistance"] += (8 + getRandomInt(3));
      attributes["Fortune"] += 5;
  };

  Object.keys(attributes).forEach(function (key) {
    nft_hash["attributes"].push({"trait_type": key,  "value": attributes[key]});
  });

  log.debug(nft_hash);
  //Сохраняем в файл JSON с информацией об агенте
  var fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify(nft_hash), 'utf8');
  //metadata = JSON.parse(fs.readFileSync(metadataLink));

  //Генерируем изображение


  var  canvas = createCanvas(400, 400);
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "blue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "24px serif";
  ctx.fillText(nft_hash["name"], 20, 100);

  //Сохраняем изображение
  fs.writeFileSync(
    image_filename,
    canvas.toBuffer("image/png")
  );


  //log.info(nft_hash);
  return nft_hash;
};

export const mintNFT = async (
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  mutableMetadata: boolean = true,
  collection: PublicKey = null,
  use: Uses = null,
): Promise<PublicKey | void> => {
    log.info('mintNFT');

  // Retrieve metadata
  const data = await createMetadata(metadataLink, collection, use);
  if (!data) return;

  // Create wallet from keypair
  const wallet = new anchor.Wallet(walletKeypair);
  if (!wallet?.publicKey) return;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  // Generate a mint
  const mint = anchor.web3.Keypair.generate();
  const instructions: TransactionInstruction[] = [];
  const signers: anchor.web3.Keypair[] = [mint, walletKeypair];

  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: mintRent,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );
  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey,
    ),
  );

  const userTokenAccoutAddress = await getTokenWallet(
    wallet.publicKey,
    mint.publicKey,
  );
  instructions.push(
    createAssociatedTokenAccountInstruction(
      userTokenAccoutAddress,
      wallet.publicKey,
      wallet.publicKey,
      mint.publicKey,
    ),
  );

  // Create metadata
  const metadataAccount = await getMetadata(mint.publicKey);
  let txnData = Buffer.from(
    serialize(
      new Map([
        DataV2.SCHEMA,
        ...METADATA_SCHEMA,
        ...CreateMetadataV2Args.SCHEMA,
      ]),
      new CreateMetadataV2Args({ data, isMutable: mutableMetadata }),
    ),
  );

  instructions.push(
    createMetadataInstruction(
      metadataAccount,
      mint.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      txnData,
    ),
  );

  instructions.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccoutAddress,
      wallet.publicKey,
      [],
      1,
    ),
  );

  // Create master edition
  const editionAccount = await getMasterEdition(mint.publicKey);
  txnData = Buffer.from(
    serialize(
      new Map([
        DataV2.SCHEMA,
        ...METADATA_SCHEMA,
        ...CreateMasterEditionV3Args.SCHEMA,
      ]),
      new CreateMasterEditionV3Args({ maxSupply: new anchor.BN(0) }),
    ),
  );

  instructions.push(
    createMasterEditionInstruction(
      metadataAccount,
      editionAccount,
      mint.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      txnData,
    ),
  );

  const res = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    instructions,
    signers,
  );

  try {
    await connection.confirmTransaction(res.txid, 'max');
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  await connection.getParsedConfirmedTransaction(res.txid, 'confirmed');
  //log.info('NFT created', res.txid);
  log.info('\n\nNFT: Mint Address is ', mint.publicKey.toBase58());
  return metadataAccount;
};

export const updateMetadata = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  collection: PublicKey = null,
  uses: Uses,
): Promise<PublicKey | void> => {
  // Retrieve metadata
  const data = await createMetadata(metadataLink, collection, uses);
  if (!data) return;

  const metadataAccount = await getMetadata(mintKey);
  const signers: anchor.web3.Keypair[] = [];
  const value = new UpdateMetadataV2Args({
    data,
    updateAuthority: walletKeypair.publicKey.toBase58(),
    primarySaleHappened: null,
    isMutable: true,
  });
  const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));

  const instructions = [
    createUpdateMetadataInstruction(
      metadataAccount,
      walletKeypair.publicKey,
      txnData,
    ),
  ];

  // Execute transaction
  const txid = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    instructions,
    signers,
  );
  console.log('Metadata updated', txid);
  log.info('\n\nUpdated NFT: Mint Address is ', mintKey.toBase58());
  return metadataAccount;
};

export const verifyCollection = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  collectionMint: PublicKey,
) => {
  const metadataAccount = await getMetadata(mintKey);
  const collectionMetadataAccount = await getMetadata(collectionMint);
  const collectionMasterEdition = await getMasterEdition(collectionMint);
  const signers: anchor.web3.Keypair[] = [walletKeypair];
  const tx = new VerifyCollection(
    { feePayer: walletKeypair.publicKey },
    {
      metadata: metadataAccount,
      collectionAuthority: walletKeypair.publicKey,
      collectionMint: collectionMint,
      collectionMetadata: collectionMetadataAccount,
      collectionMasterEdition: collectionMasterEdition,
    },
  );
  const txid = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    tx.instructions,
    signers,
  );
  return txid;
};
