import {
  Controller,
  Get,
  HttpCode,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterTenantUseCase } from '../application/register-tenant.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { ChangeOwnPasswordUseCase } from '../application/change-own-password.use-case';
import {
  ChangeOwnPasswordDto,
  LoginDto,
  RegisterTenantDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { RequestWithUser } from './tenant-context.middleware';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from './refresh-cookie';

interface RequestWithCookies extends RequestWithUser {
  cookies: Record<string, string | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly registerTenant: RegisterTenantUseCase,
    private readonly logout: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly changeOwnPassword: ChangeOwnPasswordUseCase,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async loginHandler(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.login.execute({
      email: dto.email,
      password: dto.password,
    });
    setRefreshCookie(res, this.config, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refreshHandler(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('Sesión expirada');
    }

    const result = await this.refresh.execute({ refreshToken: token });
    setRefreshCookie(res, this.config, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('register')
  async registerHandler(@Body() dto: RegisterTenantDto) {
    const result = await this.registerTenant.execute(dto);
    return { tenantId: result.tenantId, userId: result.userId };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logoutHandler(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      await this.logout.execute({ refreshToken: token });
    }
    clearRefreshCookie(res, this.config);
  }

  @Get('me')
  me(@Req() request: RequestWithUser) {
    return this.getCurrentUser.execute({
      userId: request.user!.userId,
      tenantId: request.user!.tenantId,
      permissions: request.user!.permissions,
    });
  }

  @Public()
  @Post('olvide-contrasena')
  @HttpCode(200)
  requestPasswordResetHandler(@Body() dto: RequestPasswordResetDto) {
    return this.requestPasswordReset.execute({ email: dto.email });
  }

  @Public()
  @Post('restablecer-contrasena')
  @HttpCode(200)
  async resetPasswordHandler(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPassword.execute({ token: dto.token, newPassword: dto.newPassword });
  }

  @Post('cambiar-contrasena')
  @HttpCode(200)
  async changeOwnPasswordHandler(
    @Body() dto: ChangeOwnPasswordDto,
    @Req() request: RequestWithUser,
  ): Promise<void> {
    await this.changeOwnPassword.execute({
      userId: request.user!.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }
}
