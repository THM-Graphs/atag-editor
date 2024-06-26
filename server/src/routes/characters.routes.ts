import express, { Request, Response, Router } from 'express';
import CharacterService from '../services/character.service.js';
import ICharacter from '../models/ICharacter.js';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  const collectionUuid: string = req.params.uuid;

  const characterService: CharacterService = new CharacterService();
  const characters: ICharacter[] = await characterService.getCharacters(collectionUuid);

  res.json(characters);
});

router.post('/', async (req: Request, res: Response) => {
  const collectionUuid: string = req.params.uuid;

  const { uuidStart, uuidEnd, characters } = req.body;

  const characterService: CharacterService = new CharacterService();
  const createdCharacters: ICharacter[] = await characterService.saveCharacters(
    collectionUuid,
    uuidStart,
    uuidEnd,
    characters,
  );

  res.status(200).json(createdCharacters);
});

export default router;
