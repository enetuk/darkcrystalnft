import { program } from 'commander';
import log from 'loglevel';
import { generateAgent, mintNFT, updateMetadata, verifyCollection } from './commands/mint-nft';
import { getMetadata, loadWalletKey } from './helpers/accounts';
import { parseUses } from './helpers/various';
import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getCluster } from './helpers/various';
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
program.version('1.1.0');
log.setLevel('info');

//Генерирует случайное число от 0 до max-1
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


programCommand("generate_agents")
  .option("-cn, --count-nft <number>")
  .option("--config <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath, config } = cmd.opts();
    log.info(config);

    //Читаем конфиг
    var fs = require('fs');
    var config_json = JSON.parse(fs.readFileSync(config));


    log.info("Generate " + countNft + " agents...");

    //log.info(cmd.opts());
    const walletKeyPair = loadWalletKey(keypair);

    //Временная метка генерации
    var generation_time = new Date().getTime();
    //Создаем папку для записи сгененрованных NFT-агентов
    var fs = require('fs');
    fs.mkdirSync(config_json["file_path"] + generation_time);

/*
Шансы выпадения:
Обычные: 57.5%
Редкие: 31.25%
Легендарные: 10%
Эпические: 1.25%
*/
    var mod_chances = [0.575, 0.3125, 0.1, 0.0125];

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
      log.info("Generate mod" + mod + ": " + Math.round(countNft*mod_chances[mod]))
      for(var i = 0; i<Math.round(countNft*mod_chances[mod]); i ++){
        var fname = "agent" + mod + "_" + i;
        var fraction = getRandomInt(5);
        log.info("fraction: " + fraction);
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
