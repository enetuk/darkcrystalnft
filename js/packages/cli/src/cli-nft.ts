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

programCommand("generate_agents")
  .option("-cn, --count-nft <number>")
  .option("--url-path <string>")
  .action(async (directory, cmd) => {
    //Получаем параметры запуска команды
    const { keypair, env, url, collection, useMethod, totalUses,countNft, urlPath } = cmd.opts();
    log.info("Generate " + countNft + " agents...");
    //log.info(cmd.opts());
    const walletKeyPair = loadWalletKey(keypair);

    //Временная метка генерации
    var generation_time = new Date().getTime();
    //Создаем папку для записи сгененрованных NFT-агентов
    var fs = require('fs');
    fs.mkdirSync("./nft/" + generation_time);
    for(var i = 0; i<countNft; i ++){
      generateAgent(walletKeyPair, "./nft/" + generation_time + "/agent" + i + ".json", "./nft/" + generation_time + "/agent" + i + ".png", urlPath + "/" + generation_time + "/agent" + i + ".png", 0, 0);

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
