import { program } from 'commander';
import log from 'loglevel';
import { modNames, generateAgent, createLootbox, mintNFT, updateMetadata, verifyCollection } from './commands/mint-nft';
import { getMetadata, loadWalletKey } from './helpers/accounts';
import { parseUses } from './helpers/various';
import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getCluster } from './helpers/various';
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
//Ввод значений в консоли
import * as readline from 'readline';
//разбота с HTTP-протоколом
import fetch from 'node-fetch';

const { execSync } = require("child_process");
const { exec } = require("child_process");

//import {spl_token} from "@solana/spl-token";

program.version('1.1.0');
log.setLevel('info');

//Генерирует случайное число от 0 до max-1
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
//Проверка существования файла
function fileExists(path) {
    var fs = require('fs');

  try  {
    return fs.statSync(path).isFile();
  }
  catch (e) {

    if (e.code == 'ENOENT') { // no such file or directory. File really does not exist
      return false;
    }

    throw e; // something else went wrong, we don't have rights, ...
  }
}


/*
Шансы выпадения:
Обычные: 57.5%
Редкие: 31.25%
Легендарные: 10%
Эпические: 1.25%
*/
function modChances(){
  return [0.575, 0.3125, 0.1, 0.0125];
};



programCommand("update_token") 
  //Адрес токена
  .option("-na, --nft-address <string>")
  //Конфигурация с путями, комиссиями итд
  .option("--config <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config, nftAddress } = cmd.opts();
    log.info("update lootbox " + nftAddress);
    //Соединяемся с блокчейном
    const solConnection = new web3.Connection(getCluster(env));

    let collectionKey;
    if (collection !== undefined) {
      collectionKey = new PublicKey(collection);
    }
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }
    //Читаем ключ кошелька
    const walletKeyPair = loadWalletKey(keypair);

  
     //Получаем адрес создателя токена для получения метаданных
    var nft_public_key = new PublicKey(nftAddress);
    var metadataAccount = await getMetadata(nft_public_key);
//    console.log(metadataAccount);
  //  console.log("account: " + metadataAccount.toBase58());
    var info = await solConnection.getAccountInfo(metadataAccount);
    var meta = MetadataData.deserialize(info.data);
    var token_creator = meta.updateAuthority;
    var metadata = await (await fetch(meta.data.uri, { method: 'GET' })).json();


          await updateMetadata(
              nft_public_key,
              solConnection,
              walletKeyPair,
              meta.data.uri,
              collectionKey,
              structuredUseMethod,
          );

  });


//Сжечь NFT
programCommand("burn_nft")
   //Адрес токена
  .option("-na, --nft-address <string>")
   .option("--config <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config, nftAddress } = cmd.opts();
    log.info("BURN NFT " + nftAddress);
    //Соединяемся с блокчейном
    const solConnection = new web3.Connection(getCluster(env));
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }
    //Читаем ключ кошелька
    const walletKeyPair = loadWalletKey(keypair);

    //Адрес токена
    var nft_public_key = new PublicKey(nftAddress);
     //Адрес аккаунта
    var token_accounts = await solConnection.getTokenAccountsByOwner(walletKeyPair.publicKey, {mint: nft_public_key});
    console.log(token_accounts);
    var token_account_address = token_accounts.value[0].pubkey.toString();
    //console.log("token_account_address=" + token_account_address);
    var burn_cmd = "spl-token burn " + token_account_address + " 1";
    console.log(burn_cmd);
    exec(burn_cmd, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  });

//Открытие лутбокса
programCommand("open_lootbox")
  //Адрес токена
  .option("-na, --nft-address <string>")
  //Конфигурация с путями, комиссиями итд
  .option("--config <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config, nftAddress } = cmd.opts();
    log.info("Open lootbox " + nftAddress);
    //Соединяемся с блокчейном
    const solConnection = new web3.Connection(getCluster(env));


    let collectionKey;
    if (collection !== undefined) {
      collectionKey = new PublicKey(collection);
    }
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }
    //Читаем ключ кошелька
    const walletKeyPair = loadWalletKey(keypair);
    
     //Получаем адрес создателя токена
    var nft_public_key = new PublicKey(nftAddress);
    var metadataAccount = await getMetadata(nft_public_key);
//    console.log(metadataAccount);
  //  console.log("account: " + metadataAccount.toBase58());
    var info = await solConnection.getAccountInfo(metadataAccount);
    var meta = MetadataData.deserialize(info.data);
    var token_creator = meta.updateAuthority;
//    log.info(meta.updateAuthority);
  //  log.info(walletKeyPair.publicKey.toBase58());
  //  log.info(meta);
//    log.info(meta.data.uri);
    //Получаем meta-дата лутбокса
    var metadata = await (await fetch(meta.data.uri, { method: 'GET' })).json();
//    console.log(metadata);

    //получаем аккаунт токена
//    solConnection.findAssociatedTokenAddress(nftAddress);

   // await PublicKey.findProgramAddress();
    //var token_accounts = await solConnection.getTokenAccountsByOwner(walletKeyPair.publicKey, {mint: nft_public_key});
    //var token_account_address = token_accounts.value[0].pubkey.toString();
    //console.log("token_account_address=");
    //console.log(token_account_address);

/*
     await updateMetadata(
      mintKey,
      solConnection,
      walletKeyPair,
      url,
      collectionKey,
      structuredUseMethod,
    );*/

    //Сжигаем лутбокс


    //  console.log(token_account);
    //console.log("attrs=");
    //console.log( metadata['attributes']);
    var nft_type = metadata['attributes'].find(element => (element['trait_type'] == "Type"));
    var nft_mod = metadata['attributes'].find(element => (element['trait_type'] == "Mod"));
    //console.log("nft_type="+nft_type.toString());
    //console.log("nft_type="+nft_type['value']);
    //Проверяем создателя токена
    if(token_creator != walletKeyPair.publicKey.toBase58()){
      log.error("Address " + nftAddress + " not created by " + walletKeyPair.publicKey.toBase58());
    }else 
    if(nft_type['value'] != "Lootbox"){
      log.error("NFT " + nftAddress + " is not Lootbox");

    }else{
        log.info("Generate agent from lootbox...")
        //Читаем конфиг
        var fs = require('fs');
        var config_json = JSON.parse(fs.readFileSync(config));

        //Меняем информацию о токене
         //Генерируем агента
        var fraction = getRandomInt(5);
        log.debug("fraction: " + fraction);
        //Генерируем агента
      //  console.log("e:");
    //    console.log(meta.data.uri);
  //      console.log(config_json["url_path"]);
//        console.log(config_json["file_path"]);
//        log.info("nft_mod=" + nft_mod["value"]);
        //ПОлучаем модификатор лутбокса
        var mod = modNames().indexOf(nft_mod["value"]);
  //      log.info(mod);
  //      var mod = 0;
        if(nft_mod < 0){
          console.error("Undefined mod " + nft_mod["value"]);
        }else{
          //Сжигаем токен
          //Адрес токена
          var nft_public_key = new PublicKey(nftAddress);
          //Адрес аккаунта
          var token_accounts = await solConnection.getTokenAccountsByOwner(walletKeyPair.publicKey, {mint: nft_public_key});
          //console.log(token_accounts);
          var token_account_address = token_accounts.value[0].pubkey.toString();
          //console.log("token_account_address=" + token_account_address);
          var burn_cmd = "spl-token burn " + token_account_address + " 1";
          console.log(burn_cmd);
          var exec_res = execSync(burn_cmd);
          /*
          exec(burn_cmd, (error, stdout, stderr) => {
            if (error) {
              console.log(`error: ${error.message}`);
              return;
            }
            if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
            }
            console.log(`stdout: ${stdout}`);

            //Получаем локальный путь из URL
            var agent_file_path = meta.data.uri.replace(config_json["url_path"], config_json["file_path"]);
            //console.log(agent_file_path);
            //generateAgent(walletKeyPair, agent_file_path, agent_file_path.replace(".json", ".png"), meta.data.uri.replace(".json", ".png") + "?opened=1", fraction, mod, config_json["seller_fee_basis_points"]);

          });*/


          //Генерируем нового агента
          //Получаем локальный путь из URL
          var agent_file_path = meta.data.uri.replace(config_json["url_path"], config_json["file_path"]);
          //console.log(agent_file_path);
          generateAgent(walletKeyPair, agent_file_path, agent_file_path.replace(".json", ".png"), meta.data.uri.replace(".json", ".png") + "?opened=1", fraction, mod, config_json["seller_fee_basis_points"]);


          //log.info(exec_res);

           /*
          //Отправляем данные в блокчейн
          await updateMetadata(
              nft_public_key,
              solConnection,
              walletKeyPair,
              meta.data.uri,
              collectionKey,
              structuredUseMethod,
          );*/
          //Отправляем данные в блокчейн
          var mint_pub = await mintNFT(
            solConnection,
            walletKeyPair,
            meta.data.uri + "?opened=1",
            true,
            undefined,
            structuredUseMethod,
          );  


        };
        /*


        createLootbox(walletKeyPair, config_json["file_path"] + generation_time + "/" + fname + ".json", config_json["file_path"] + generation_time + "/" + fname + ".png", config_json["url_path"] + generation_time + "/" + fname + ".png", mod, seriesName, config_json["seller_fee_basis_points"]);

        //Отправляем данные в блокчейн
        var mint_pub = await mintNFT(
          solConnection,
          walletKeyPair,
          config_json["url_path"] + generation_time + "/" + fname + ".json",


       await updateMetadata(
        nftAddress,
        solConnection,
        walletKeyPair,
        url,
        collectionKey,
        structuredUseMethod,
      );*/

    };

});

//Генерирование лутбоксов
programCommand("create_lootboxes")
  //Количество лутбоксов
  .option("-cn, --count-nft <number>")
  //Конфигурация с путями, комиссиями итд
  .option("--config <string>")
  //Навазние серии
  .option("-sname --series-name <string>")

  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config, seriesName } = cmd.opts();
    log.info(config);
    //Читаем конфиг
    var fs = require('fs');
    //Читаем конфиг
    var config_json = JSON.parse(fs.readFileSync(config));
    log.info("Generate " + countNft + " lootboxes...");
    //Читаем ключ кошелька
    const walletKeyPair = loadWalletKey(keypair);
    //Временная метка генерации
    var generation_time = new Date().getTime();
    //Создаем папку для записи сгененрованных NFT-агентов
    var fs = require('fs');
    fs.mkdirSync(config_json["file_path"] + generation_time);
    //Соединяемся с блокчейном
    const solConnection = new web3.Connection(getCluster(env));
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }

    log.info("Generate NFT Series " + seriesName);
    //Цикл по видам лутбокса (обычный - эпический)
    for(var mod=0; mod<modChances().length; mod++){
      log.info("Count NFT Lootboxes for mod №" + mod + ": " + Math.round(countNft*modChances()[mod]))
      for(var i = 0; i<Math.round(countNft*modChances()[mod]); i ++){
        var fname = "lootbox" + mod + "_" + i;
        //Генерируем агента
        createLootbox(walletKeyPair, config_json["file_path"] + generation_time + "/" + fname + ".json", config_json["file_path"] + generation_time + "/" + fname + ".png", config_json["url_path"] + generation_time + "/" + fname + ".png", mod, seriesName, config_json["seller_fee_basis_points"]);

        //Отправляем данные в блокчейн
        var mint_pub = await mintNFT(
          solConnection,
          walletKeyPair,
          config_json["url_path"] + generation_time + "/" + fname + ".json",
          true,
          undefined,
          structuredUseMethod,
        );  



      };

    };
  });
//Генерирование агентов
programCommand("generate_agents")
  .option("-cn, --count-nft <number>")
  .option("--config <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config } = cmd.opts();
    log.info(config);

    //Читаем конфиг
    var fs = require('fs');
    //Читаем конфиг
    var config_json = JSON.parse(fs.readFileSync(config));


    log.info("Generate " + countNft + " agents...");

    //log.info(cmd.opts());
    //Читаем ключ кошелька
    const walletKeyPair = loadWalletKey(keypair);

    //Временная метка генерации
    var generation_time = new Date().getTime();
    //Создаем папку для записи сгененрованных NFT-агентов
    var fs = require('fs');
    fs.mkdirSync(config_json["file_path"] + generation_time);

    //Шансы выпадения
    var mod_chances = modChances();

    //Соединяемся с блокчейном
    const solConnection = new web3.Connection(getCluster(env));
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }

    //Цикл по видам лутбокса (обычный - эпический)
    for(var mod=0; mod<mod_chances.length; mod++){
      //Выбираем фракцию
      //Выводим количество NFT которые будут сгенерированы для кажого из модов
      log.info("Count NFTs for mod №" + mod + ": " + Math.round(countNft*mod_chances[mod]))
      for(var i = 0; i<Math.round(countNft*mod_chances[mod]); i ++){
        var fname = "agent" + mod + "_" + i;
        var fraction = getRandomInt(5);
        log.debug("fraction: " + fraction);
        //Генерируем агента
        generateAgent(walletKeyPair, config_json["file_path"] + generation_time + "/" + fname + ".json", config_json["file_path"] + generation_time + "/" + fname + ".png", config_json["url_path"] + generation_time + "/" + fname + ".png", fraction, mod, config_json["seller_fee_basis_points"]);

        //Отправляем данные в блокчейн
        var mint_pub = await mintNFT(
          solConnection,
          walletKeyPair,
          config_json["url_path"] + generation_time + "/" + fname + ".json",
          true,
          undefined,
          structuredUseMethod,
        );  



      };

    };




  });
programCommand('mint')
  .option('-u, --url <string>', 'metadata url')
  .option(
    '-c, --collection <string>',
    'Optional: Set this NFT as a part of a collection, Note you must be updat authority for this to work.',
  )
  .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
  .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, url, collection, useMethod, totalUses } = cmd.opts();
    const solConnection = new web3.Connection(getCluster(env));
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }
    const walletKeyPair = loadWalletKey(keypair);
    let collectionKey;
    if (collection !== undefined) {
      collectionKey = new PublicKey(collection);
    }
    await mintNFT(
      solConnection,
      walletKeyPair,
      url,
      true,
      collectionKey,
      structuredUseMethod,
    );
  });
/*
programCommand('update-metadata')
  .option('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  .option(
    '-c, --collection <string>',
    'Optional: Set this NFT as a part of a collection, Note you must be updat authority for this to work.',
  )
  .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
  .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, url, collection, useMethod, totalUses } =
      cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
      if (structuredUseMethod) {
        const info = await solConnection.getAccountInfo(mintKey);
        const meta = MetadataData.deserialize(info.data);
        if (meta?.uses && meta.uses.total > meta.uses.remaining) {
          log.error(
            'FAILED: This call will fail if you have used the NFT, you cannot change USES after using.',
          );
          return;
        }
      }
    } catch (e) {
      log.error(e);
    }
    let collectionKey;
    if (collection) {
      collectionKey = new PublicKey(collection);
    }
    await updateMetadata(
      mintKey,
      solConnection,
      walletKeyPair,
      url,
      collectionKey,
      structuredUseMethod,
    );
  });
*/
programCommand('verify-collection')
  .option('-m, --mint <string>', 'base58 mint key')
  .option(
    '-c, --collection-mint <string>',
    'base58 mint key: A collection is an NFT that can be verified as the collection for this nft',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, collectionMint } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const collectionMintKey = new PublicKey(collectionMint);
    const solConnection = new web3.Connection(getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    await verifyCollection(
      mintKey,
      solConnection,
      walletKeyPair,
      collectionMintKey,
    );
  });

program
  .command('show')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option('-l, --log-level <string>', 'log level', setLogLevel)
  .option('-m, --mint <string>', 'base58 mint key')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { env, mint } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(getCluster(env));
    const metadataAccount = await getMetadata(mintKey);
    const info = await solConnection.getAccountInfo(metadataAccount);
    if (info) {
      const meta = MetadataData.deserialize(info.data);
      log.info(meta);
    } else {
      log.info(`No Metadata account associated with: ${mintKey}`);
    }
  });

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
    .option(
      '-k, --keypair <path>',
      `Solana wallet location`,
      '--keypair not provided',
    )
    .option('-l, --log-level <string>', 'log level', setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null) {
    return;
  }
  log.info('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv);
