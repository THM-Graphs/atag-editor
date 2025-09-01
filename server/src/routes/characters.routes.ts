import express, { NextFunction, Request, Response, Router } from 'express';
import CharacterService from '../services/character.service.js';
import ICharacter from '../models/ICharacter.js';
import { Character } from '../models/types.js';

const router: Router = express.Router({ mergeParams: true });

const characterService: CharacterService = new CharacterService();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const textUuid: string = req.params.textUuid;

  try {
    const characters: Character[] = await characterService.getCharacters(textUuid);

    res.status(200).json(characters);
  } catch (error: unknown) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const textUuid: string = req.params.textUuid;

  const { uuidStart, uuidEnd, characters, text } = req.body;

  try {
    const updatedCharacters: ICharacter[] = await characterService.saveCharacters(
      textUuid,
      uuidStart,
      uuidEnd,
      characters,
      text,
    );

    res.status(200).json(updatedCharacters);
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
