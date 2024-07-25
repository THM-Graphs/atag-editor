import express, { NextFunction, Request, Response, Router } from 'express';
import CharacterService from '../services/character.service.js';
import ICharacter from '../models/ICharacter.js';
import { Character } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const characterService: CharacterService = new CharacterService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const collectionUuid: string = req.params.uuid;

  try {
    const characters: Character[] = await characterService.getCharacters(collectionUuid);

    res.status(200).json(characters);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const collectionUuid: string = req.params.uuid;

  const { uuidStart, uuidEnd, characters } = req.body;

  try {
    const updatedCharacters: ICharacter[] = await characterService.saveCharacters(
      collectionUuid,
      uuidStart,
      uuidEnd,
      characters,
    );

    res.status(200).json(updatedCharacters);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
