import { CreateClientRequestDTO } from '@application';
import type { ICreateClientUseCase } from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		ClientController: ClientController;
	}
}

@Injectable({ name: 'ClientController', depends: ['CreateClientUseCase'] })
export class ClientController {
	constructor(private readonly createUseCase: ICreateClientUseCase) {}

	public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user!.userId;
			const request = CreateClientRequestDTO.fromBody(req.body);
			const response = this.createUseCase.execute(userId, request);

			res.status(201).json((await response).toJSON());
		} catch (error) {
			next(error);
		}
	};
}
